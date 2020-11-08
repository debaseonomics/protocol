// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "./lib/SafeMathInt.sol";
import "./lib/UInt256Lib.sol";

interface IOracle {
    function getData() external returns (uint256, bool);
}

interface DebaseI {
    function totalSupply() external view returns (uint256);

    function balanceOf(address who) external returns (uint256);

    function rebase(uint256 epoch, int256 supplyDelta)
        external
        returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);
}

interface StabilizerI {
    function owner() external returns (address);

    function checkStabilizerAndGetReward(
        int256 supplyDelta_,
        int256 rebaseLag_,
        uint256 exchangeRate_,
        uint256 debasePolicyBalance
    ) external returns (uint256 rewardAmount_);
}

/**
 * @title Debase Monetary Supply Policy
 * @dev This is an implementation of the Debase Ideal Money protocol.
 *      Debase operates asymmetrically on expansion and contraction. It will both split and
 *      combine coins to maintain a stable unit price.
 *
 *      This component regulates the token supply of the Debase ERC20 token in response to
 *      market oracles.
 */
contract DebasePolicy is Ownable, Initializable {
    using SafeMath for uint256;
    using SafeMathInt for int256;
    using UInt256Lib for uint256;

    event LogRebase(
        uint256 indexed epoch_,
        uint256 exchangeRate_,
        int256 requestedSupplyAdjustment_,
        int256 rebaseLag_,
        uint256 timestampSec_
    );

    event LogSetDeviationThreshold(
        uint256 lowerDeviationThreshold_,
        uint256 upperDeviationThreshold_
    );

    event LogSetDefaultRebaseLag(
        uint256 defaultPositiveRebaseLag_,
        uint256 defaultNegativeRebaseLag_
    );

    event LogSetUseDefaultRebaseLag(bool useDefaultRebaseLag_);

    event LogUsingDefaultRebaseLag(int256 defaultRebaseLag_);

    event LogSetRebaseTimingParameters(
        uint256 minRebaseTimeIntervalSec_,
        uint256 rebaseWindowOffsetSec_,
        uint256 rebaseWindowLengthSec_
    );

    event LogSetOracle(address oracle_);

    event LogNewLagBreakpoint(
        bool indexed selected,
        int256 indexed lowerDelta_,
        int256 indexed upperDelta_,
        int256 lag_
    );

    event LogUpdateBreakpoint(
        bool indexed selected,
        int256 indexed lowerDelta_,
        int256 indexed upperDelta_,
        int256 lag_
    );

    event LogDeleteBreakpoint(
        bool indexed selected,
        int256 lowerDelta_,
        int256 upperDelta_,
        int256 lag_
    );

    event LogSelectedBreakpoint(
        int256 lowerDelta_,
        int256 upperDelta_,
        int256 lag_
    );

    event LogSetPriceTargetRate(uint256 setPriceTargetRate_);

    event LogDeleteStabilizerPool(StabilizerI pool_);

    event LogAddNewStabilizerPool(StabilizerI pool_);

    event LogSetStabilizerPoolEnabled(uint256 index_, bool enabled_);

    event LogRewardSentToStabilizer(
        uint256 index,
        StabilizerI poolI,
        uint256 transferAmount
    );

    // Struct of rebase lag break point. It defines the supply delta range within which the lag can be applied.
    struct LagBreakpoint {
        int256 lowerDelta;
        int256 upperDelta;
        int256 lag;
    }

    struct StabilizerPool {
        bool enabled;
        StabilizerI pool;
    }

    // Address of the debase token
    DebaseI public debase;

    // Market oracle provides the token/USD exchange rate as an 18 decimal fixed point number.
    // (eg) An oracle value of 1.5e18 it would mean 1 Ample is trading for $1.50.
    IOracle public oracle;

    // If the current exchange rate is within this fractional distance from the target, no supply
    // update is performed. Fixed point number--same format as the rate.
    // (ie) (rate - targetRate) / targetRate < upperdeviationThreshold or lowerdeviationThreshold, then no supply change.
    // DECIMALS Fixed point number.
    // deviationThreshold = 0.05e18 = 5e16
    uint256 public upperDeviationThreshold;
    uint256 public lowerDeviationThreshold;

    //Flag to use default rebase lag instead of the breakpoints.
    bool public useDefaultRebaseLag;

    // The rebase lag parameter, used to dampen the applied supply adjustment by 1 / rebaseLag
    // Check setRebaseLag comments for more details.
    // Natural number, no decimal places.
    uint256 public defaultPositiveRebaseLag;

    uint256 public defaultNegativeRebaseLag;

    //List of breakpoints for positive supply delta
    LagBreakpoint[] public upperLagBreakpoints;
    //List of breakpoints for negative supply delta
    LagBreakpoint[] public lowerLagBreakpoints;

    // More than this much time must pass between rebase operations.
    uint256 public minRebaseTimeIntervalSec;

    // Block timestamp of last rebase operation
    uint256 public lastRebaseTimestampSec;

    // The rebase window begins this many seconds into the minRebaseTimeInterval period.
    // For example if minRebaseTimeInterval is 24hrs, it represents the time of day in seconds.
    uint256 public rebaseWindowOffsetSec;

    // The length of the time window where a rebase operation is allowed to execute, in seconds.
    uint256 public rebaseWindowLengthSec;

    StabilizerPool[] public stabilizerPools;

    // THe price target to meet
    uint256 public priceTargetRate = 10**DECIMALS;

    // The number of rebase cycles since inception
    uint256 public epoch;

    uint256 private constant DECIMALS = 18;

    // Due to the expression in computeSupplyDelta(), MAX_RATE * MAX_SUPPLY must fit into an int256.
    // Both are 18 decimals fixed point numbers.
    uint256 private constant MAX_RATE = 10**6 * 10**DECIMALS;
    // MAX_SUPPLY = MAX_INT256 / MAX_RATE
    uint256 private constant MAX_SUPPLY = ~(uint256(1) << 255) / MAX_RATE;

    // This module orchestrates the rebase execution and downstream notification.
    address public orchestrator;

    modifier onlyOrchestrator() {
        require(msg.sender == orchestrator);
        _;
    }

    modifier indexInBounds(uint256 index) {
        require(
            index < stabilizerPools.length,
            "Index must be less than array length"
        );
        _;
    }

    /**
     * @notice Initializes the debase policy with addresses of the debase token and the oracle deployer. Along with inital rebasing parameters
     * @param debase_ Address of the debase token
     * @param orchestrator_ Address of the protocol orchestrator
     */
    function initialize(address debase_, address orchestrator_)
        external
        initializer
        onlyOwner
    {
        debase = DebaseI(debase_);
        orchestrator = orchestrator_;

        upperDeviationThreshold = 5 * 10**(DECIMALS - 2);
        lowerDeviationThreshold = 5 * 10**(DECIMALS - 2);

        useDefaultRebaseLag = false;
        defaultPositiveRebaseLag = 30;
        defaultNegativeRebaseLag = 30;

        minRebaseTimeIntervalSec = 24 hours;
        lastRebaseTimestampSec = 0;
        rebaseWindowOffsetSec = 72000;
        rebaseWindowLengthSec = 15 minutes;

        priceTargetRate = 10**DECIMALS;

        epoch = 0;
    }

    function addNewStabilizerPool(address pool_) external onlyOwner {
        StabilizerPool memory instance = StabilizerPool(
            false,
            StabilizerI(pool_)
        );

        require(
            instance.pool.owner() == owner(),
            "Must have the same owner as policy contract"
        );

        stabilizerPools.push(instance);
        emit LogAddNewStabilizerPool(instance.pool);
    }

    function deleteStabilizerPool(uint256 index)
        external
        indexInBounds(index)
        onlyOwner
    {
        StabilizerPool memory instanceToDelete = stabilizerPools[index];
        require(
            !instanceToDelete.enabled,
            "Only a disabled pool can be deleted"
        );
        uint256 length = stabilizerPools.length.sub(1);
        if (index < length) {
            stabilizerPools[index] = stabilizerPools[length];
        }
        emit LogDeleteStabilizerPool(instanceToDelete.pool);
        stabilizerPools.pop();
        delete instanceToDelete;
    }

    function setStabilizerPoolEnabled(uint256 index, bool enabled)
        external
        indexInBounds(index)
        onlyOwner
    {
        StabilizerPool storage instance = stabilizerPools[index];
        instance.enabled = enabled;
        emit LogSetStabilizerPoolEnabled(index, instance.enabled);
    }

    /**
     * @notice Sets the price target for rebases to compare against
     * @param priceTargetRate_ The new price target
     */
    function setPriceTargetRate(uint256 priceTargetRate_) external onlyOwner {
        require(priceTargetRate_ > 0);
        priceTargetRate = priceTargetRate_;
        emit LogSetPriceTargetRate(priceTargetRate_);
    }

    /**
     * @notice Function to set the oracle to get the exchange price
     * @param oracle_ Address of the debase oracle
     */
    function setOracle(address oracle_) external onlyOwner {
        oracle = IOracle(oracle_);
        emit LogSetOracle(oracle_);
    }

    /**
     * @notice Initiates a new rebase operation, provided the minimum time period has elapsed.
     * @dev The supply adjustment equals (_totalSupply * DeviationFromTargetRate) / rebaseLag
     *      Where DeviationFromTargetRate is (MarketOracleRate - targetRate) / targetRate
     *      and targetRate is CpiOracleRate / baseCpi
     */
    function rebase() external onlyOrchestrator {
        require(inRebaseWindow(), "Not in rebase window");

        //This comparison also ensures there is no reentrancy.
        require(lastRebaseTimestampSec.add(minRebaseTimeIntervalSec) < now);

        //Snap the rebase time to the start of this window.
        lastRebaseTimestampSec = now.sub(now.mod(minRebaseTimeIntervalSec)).add(
            rebaseWindowOffsetSec
        );

        epoch = epoch.add(1);

        uint256 exchangeRate;
        bool rateValid;
        (exchangeRate, rateValid) = oracle.getData();
        require(rateValid);

        if (exchangeRate > MAX_RATE) {
            exchangeRate = MAX_RATE;
        }

        int256 supplyDelta = computeSupplyDelta(exchangeRate, priceTargetRate);
        int256 rebaseLag;

        if (supplyDelta != 0) {
            //Get rebase lag if the supply delta isn't zero
            rebaseLag = getRebaseLag(supplyDelta);

            // Apply the Dampening factor.
            supplyDelta = supplyDelta.div(rebaseLag);
        }

        if (
            supplyDelta > 0 &&
            debase.totalSupply().add(uint256(supplyDelta)) > MAX_SUPPLY
        ) {
            supplyDelta = (MAX_SUPPLY.sub(debase.totalSupply())).toInt256Safe();
        }

        checkStabilizers(supplyDelta, rebaseLag, exchangeRate);

        uint256 supplyAfterRebase = debase.rebase(epoch, supplyDelta);
        assert(supplyAfterRebase <= MAX_SUPPLY);
        emit LogRebase(epoch, exchangeRate, supplyDelta, rebaseLag, now);
    }

    function checkStabilizers(
        int256 supplyDelta_,
        int256 rebaseLag_,
        uint256 exchangeRate_
    ) internal {
        for (
            uint256 index = 0;
            index < stabilizerPools.length;
            index = index.add(1)
        ) {
            StabilizerPool memory instance = stabilizerPools[index];
            if (instance.enabled) {
                uint256 rewardToTransfer = instance
                    .pool
                    .checkStabilizerAndGetReward(
                    supplyDelta_,
                    rebaseLag_,
                    exchangeRate_,
                    debase.balanceOf(address(this))
                );

                if (rewardToTransfer != 0) {
                    debase.transfer(address(instance.pool), rewardToTransfer);
                    emit LogRewardSentToStabilizer(
                        index,
                        instance.pool,
                        rewardToTransfer
                    );
                }
            }
        }
    }

    /**
     * @notice Returns an apporiate rebase lag based either upon the inputed supply delta. The lag is either chose from an array of negative or positive
     *         supply delta. This allows of the application of unsymmetrical lag based upon the current supply delta.
     *         The function will also pick the default rebase lag if it's set to do so by the default rebase lag flag or if the breakpoint arrays are empty.
     * @param supplyDelta_ The new supply from give to get a corresponding rebase lag.
     * @return The selected rebase lag to apply.
     */
    function getRebaseLag(int256 supplyDelta_) private returns (int256) {
        int256 lag;
        int256 supplyDeltaAbs = supplyDelta_.abs();

        if (!useDefaultRebaseLag) {
            if (supplyDelta_ < 0) {
                lag = findBreakpoint(supplyDeltaAbs, lowerLagBreakpoints);
            } else {
                lag = findBreakpoint(supplyDeltaAbs, upperLagBreakpoints);
            }
            if (lag != 0) {
                return lag;
            }
        }

        if (supplyDelta_ < 0) {
            emit LogUsingDefaultRebaseLag(
                defaultNegativeRebaseLag.toInt256Safe()
            );
            return defaultNegativeRebaseLag.toInt256Safe();
        } else {
            emit LogUsingDefaultRebaseLag(
                defaultPositiveRebaseLag.toInt256Safe()
            );
            return defaultPositiveRebaseLag.toInt256Safe();
        }
    }

    function findBreakpoint(int256 supplyDelta, LagBreakpoint[] memory array)
        internal
        returns (int256)
    {
        LagBreakpoint memory instance;

        for (uint256 index = 0; index < array.length; index = index.add(1)) {
            instance = array[index];

            if (supplyDelta < instance.lowerDelta) {
                //Gab in break points found
                break;
            }
            if (supplyDelta <= instance.upperDelta) {
                emit LogSelectedBreakpoint(
                    instance.lowerDelta,
                    instance.upperDelta,
                    instance.lag
                );
                return instance.lag;
            }
        }
        return 0;
    }

    /**
     * @notice Sets the default rebase lag parameter. It is used to dampen the applied supply adjustment by 1 / rebaseLag.
               If the rebase lag R, equals 1, the smallest value for R, then the full supply correction is applied on each rebase cycle.
               If it is greater than 1, then a correction of 1/R of is applied on each rebase.
               This lag will be used if the default rebase flag is set or if the rebase breakpoint array's are empty.
     * @param defaultPositiveRebaseLag_ The new positive rebase lag parameter.
     * @param defaultNegativeRebaseLag_ The new negative rebase lag parameter.
     */
    function setDefaultRebaseLags(
        uint256 defaultPositiveRebaseLag_,
        uint256 defaultNegativeRebaseLag_
    ) external onlyOwner {
        require(
            defaultPositiveRebaseLag_ > 0 && defaultNegativeRebaseLag_ > 0,
            "Lag must be greater than zero"
        );

        defaultPositiveRebaseLag = defaultPositiveRebaseLag_;
        defaultNegativeRebaseLag = defaultNegativeRebaseLag_;
        emit LogSetDefaultRebaseLag(
            defaultPositiveRebaseLag,
            defaultNegativeRebaseLag
        );
    }

    /**
     * @notice Function used to set if the default rebase flag will be used.
     * @param useDefaultRebaseLag_ Sets default rebase lag flag.
     */
    function setUseDefaultRebaseLag(bool useDefaultRebaseLag_)
        external
        onlyOwner
    {
        useDefaultRebaseLag = useDefaultRebaseLag_;
        emit LogSetUseDefaultRebaseLag(useDefaultRebaseLag);
    }

    /**
     * @notice Adds new rebase lag parameters into either the upper or lower lag breakpoints. This allows the configuration of custom lag parameters
     *         based upon the current range the supply delta is within in. Along with this the two seperate lag breakpoint arrays allows of configuration for
     *         positive and negative supply delta ranges.
     * @param select Flag to select whether the new breakpoint should go in the upper or lower lag breakpoint.
     * @param lowerDelta_ The lower range in which the delta can be in.
     * @param upperDelta_ The upper range in which the delta can be in.
     * @param lag_ The lag to use in a given range.
     */
    function addNewLagBreakpoint(
        bool select,
        int256 lowerDelta_,
        int256 upperDelta_,
        int256 lag_
    ) public onlyOwner {
        require(
            lowerDelta_ >= 0 && lowerDelta_ < upperDelta_,
            "Lower delta must be less than upper delta"
        );
        require(lag_ > 0, "Lag can't be zero");

        LagBreakpoint memory newPoint = LagBreakpoint(
            lowerDelta_,
            upperDelta_,
            lag_
        );

        LagBreakpoint memory lastPoint;
        uint256 length;

        if (select) {
            length = upperLagBreakpoints.length;
            if (length > 0) {
                lastPoint = upperLagBreakpoints[length.sub(1)];
                require(lastPoint.upperDelta <= lowerDelta_);
            }

            upperLagBreakpoints.push(newPoint);
        } else {
            length = lowerLagBreakpoints.length;
            if (length > 0) {
                lastPoint = lowerLagBreakpoints[length.sub(1)];
                require(lastPoint.upperDelta <= lowerDelta_);
            }

            lowerLagBreakpoints.push(newPoint);
        }
        emit LogNewLagBreakpoint(select, lowerDelta_, upperDelta_, lag_);
    }

    /**
     * @notice Updates lag breakpoint at a the specified index with new delta range parameters and lag.
     * @param select Flag to select whether the new breakpoint should go in the upper or lower lag breakpoint.
     * @param index The index of the selected breakpoint.
     * @param lowerDelta_ The lower range in which the delta can be in.
     * @param upperDelta_ The upper range in which the delta can be in.
     * @param lag_ The lag to use in a given range.
     */
    function updateLagBreakpoint(
        bool select,
        uint256 index,
        int256 lowerDelta_,
        int256 upperDelta_,
        int256 lag_
    ) public onlyOwner {
        LagBreakpoint storage instance;

        require(
            lowerDelta_ >= 0 && lowerDelta_ < upperDelta_,
            "Lower delta must be less than upper delta"
        );
        require(lag_ > 0, "Lag can't be zero");

        if (select) {
            withinPointRange(
                index,
                lowerDelta_,
                upperDelta_,
                upperLagBreakpoints
            );
            instance = upperLagBreakpoints[index];
        } else {
            withinPointRange(
                index,
                lowerDelta_,
                upperDelta_,
                lowerLagBreakpoints
            );
            instance = lowerLagBreakpoints[index];
        }
        instance.lowerDelta = lowerDelta_;
        instance.upperDelta = upperDelta_;
        instance.lag = lag_;
        emit LogUpdateBreakpoint(select, lowerDelta_, upperDelta_, lag_);
    }

    function withinPointRange(
        uint256 index,
        int256 lowerDelta_,
        int256 upperDelta_,
        LagBreakpoint[] memory array
    ) internal pure {
        uint256 length = array.length;
        require(length > 0, "Can't update empty breakpoint array");
        require(index <= length.sub(1), "Index higher than elements avaiable");

        LagBreakpoint memory lowerPoint;
        LagBreakpoint memory upperPoint;

        if (index == 0) {
            if (length == 1) {
                return;
            }
            upperPoint = array[index.add(1)];
            require(upperDelta_ <= upperPoint.lowerDelta);
        } else if (index == length.sub(1)) {
            lowerPoint = array[index.sub(1)];
            require(lowerDelta_ >= lowerPoint.upperDelta);
        } else {
            upperPoint = array[index.add(1)];
            lowerPoint = array[index.sub(1)];
            require(
                lowerDelta_ >= lowerPoint.upperDelta &&
                    upperDelta_ <= upperPoint.lowerDelta
            );
        }
    }

    /**
     * @notice Delete lag breakpoint from the end of either upper and lower breakpoint array.
     * @param select Whether to delete from upper or lower breakpoint array.
     */
    function deleteLagBreakpoint(bool select) public onlyOwner {
        LagBreakpoint memory instanceToDelete;
        if (select) {
            require(
                upperLagBreakpoints.length > 0,
                "Can't delete empty breakpoint array"
            );
            instanceToDelete = upperLagBreakpoints[upperLagBreakpoints
                .length
                .sub(1)];
            upperLagBreakpoints.pop();
        } else {
            require(
                lowerLagBreakpoints.length > 0,
                "Can't delete empty breakpoint array"
            );
            instanceToDelete = lowerLagBreakpoints[lowerLagBreakpoints
                .length
                .sub(1)];
            lowerLagBreakpoints.pop();
        }
        emit LogDeleteBreakpoint(
            select,
            instanceToDelete.lowerDelta,
            instanceToDelete.upperDelta,
            instanceToDelete.lag
        );
        delete instanceToDelete;
    }

    /**
     * @notice Sets the deviation threshold fraction. If the exchange rate given by the market
     *         oracle is within this fractional distance from the targetRate, then no supply
     *         modifications are made. DECIMALS fixed point number.
     * @param upperDeviationThreshold_ The new exchange rate threshold fraction.
     * @param lowerDeviationThreshold_ The new exchange rate threshold fraction.
     */
    function setDeviationThresholds(
        uint256 upperDeviationThreshold_,
        uint256 lowerDeviationThreshold_
    ) external onlyOwner {
        upperDeviationThreshold = upperDeviationThreshold_;
        lowerDeviationThreshold = lowerDeviationThreshold_;
        emit LogSetDeviationThreshold(
            upperDeviationThreshold,
            lowerDeviationThreshold
        );
    }

    /**
     * @notice Sets the parameters which control the timing and frequency of
     *         rebase operations.
     *         a) the minimum time period that must elapse between rebase cycles.
     *         b) the rebase window offset parameter.
     *         c) the rebase window length parameter.
     * @param minRebaseTimeIntervalSec_ More than this much time must pass between rebase
     *        operations, in seconds.
     * @param rebaseWindowOffsetSec_ The number of seconds from the beginning of
              the rebase interval, where the rebase window begins.
     * @param rebaseWindowLengthSec_ The length of the rebase window in seconds.
     */
    function setRebaseTimingParameters(
        uint256 minRebaseTimeIntervalSec_,
        uint256 rebaseWindowOffsetSec_,
        uint256 rebaseWindowLengthSec_
    ) external onlyOwner {
        require(minRebaseTimeIntervalSec_ > 0);
        require(rebaseWindowOffsetSec_ < minRebaseTimeIntervalSec_);

        minRebaseTimeIntervalSec = minRebaseTimeIntervalSec_;
        rebaseWindowOffsetSec = rebaseWindowOffsetSec_;
        rebaseWindowLengthSec = rebaseWindowLengthSec_;

        emit LogSetRebaseTimingParameters(
            minRebaseTimeIntervalSec_,
            rebaseWindowOffsetSec_,
            rebaseWindowLengthSec_
        );
    }

    /**
     * @return If the latest block timestamp is within the rebase time window it, returns true.
     *         Otherwise, returns false.
     */
    function inRebaseWindow() public view returns (bool) {
        return (now.mod(minRebaseTimeIntervalSec) >= rebaseWindowOffsetSec &&
            now.mod(minRebaseTimeIntervalSec) <
            (rebaseWindowOffsetSec.add(rebaseWindowLengthSec)));
    }

    /**
     * @return Computes the total supply adjustment in response to the exchange rate
     *         and the targetRate.
     */
    function computeSupplyDelta(uint256 rate, uint256 targetRate)
        private
        view
        returns (int256)
    {
        if (withinDeviationThreshold(rate, targetRate)) {
            return 0;
        }

        // supplyDelta = totalSupply * (rate - targetRate) / targetRate
        int256 targetRateSigned = targetRate.toInt256Safe();
        return
            debase
                .totalSupply()
                .toInt256Safe()
                .mul(rate.toInt256Safe().sub(targetRateSigned))
                .div(targetRateSigned);
    }

    /**
     * @notice Function to determine if a rate is within the upper or lower deviation from the target rate.
     * @param rate The current exchange rate, an 18 decimal fixed point number.
     * @param targetRate The target exchange rate, an 18 decimal fixed point number.
     * @return If the rate is within the upper or lower deviation threshold from the target rate, returns true.
     *         Otherwise, returns false.
     */
    function withinDeviationThreshold(uint256 rate, uint256 targetRate)
        private
        view
        returns (bool)
    {
        uint256 upperThreshold = targetRate.mul(upperDeviationThreshold).div(
            10**DECIMALS
        );

        uint256 lowerThreshold = targetRate.mul(lowerDeviationThreshold).div(
            10**DECIMALS
        );

        return
            (rate >= targetRate && rate.sub(targetRate) < upperThreshold) ||
            (rate < targetRate && targetRate.sub(rate) < lowerThreshold);
    }
}
