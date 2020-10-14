import { run, ethers } from '@nomiclabs/buidler';

import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';
import StakingPoolArtifact from '../artifacts/StakingPool.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';
import DegovArtifact from '../artifacts/Degov.json';
import DebaseArtifact from '../artifacts/Debase.json';

import { Degov } from '../type/Degov';
import { Debase } from '../type/Debase';
import { GovernorAlpha } from '../type/GovernorAlpha';
import { Timelock } from '../type/Timelock';
import { StakingPool } from '../type/StakingPool';
import { DebasePolicy } from '../type/DebasePolicy';
import { Orchestrator } from '../type/Orchestrator';
import { promises } from 'fs';
import { WETH } from '@uniswap/sdk';

async function main() {
	const signer = await ethers.getSigners();

	try {
		let data = await promises.readFile('contracts.json', 'utf-8');
		let dataParse = JSON.parse(data.toString());

		const degov = ((await ethers.getContractAt(DegovArtifact.abi, dataParse['degov'], signer[0])) as any) as Degov;
		const debase = ((await ethers.getContractAt(
			DebaseArtifact.abi,
			dataParse['debase'],
			signer[0]
		)) as any) as Debase;

		const governorAlpha = ((await ethers.getContractAt(
			GovernorAlphaArtifact.abi,
			dataParse['governorAlpha'],
			signer[0]
		)) as any) as GovernorAlpha;
		const timelock = ((await ethers.getContractAt(
			TimelockArtifact.abi,
			dataParse['timelock'],
			signer[0]
		)) as any) as Timelock;

		const debaseDaiPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['debaseDaiPool'],
			signer[0]
		)) as any) as StakingPool;

		const debaseDaiLpPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['debaseDaiLpPool'],
			signer[0]
		)) as any) as StakingPool;

		const degovUsdcPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovUsdcPool'],
			signer[0]
		)) as any) as StakingPool;

		const degovUsdcLpPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovUsdcLpPool'],
			signer[0]
		)) as any) as StakingPool;

		const debasePolicy = ((await ethers.getContractAt(
			DebasePolicyArtifact.abi,
			dataParse['debasePolicy'],
			signer[0]
		)) as any) as DebasePolicy;
		const orchestrator = ((await ethers.getContractAt(
			OrchestratorArtifact.abi,
			dataParse['orchestrator'],
			signer[0]
		)) as any) as Orchestrator;

		const one_hour = 60 * 60;
		const one_day = 24 * one_hour;
		const two_days = 2 * one_day;
		const three_days = 3 * one_day;
		const four_days = 4 * one_day;
		const three_weeks = 21 * one_day;

		const rebaseRequiredSupplyRatio = 95;

		const debaseDaiPoolParams = {
			name: 'Debase/DAI Pool', //name
			rewardToken: dataParse['debase'], // Reward Token
			stakeToken: dataParse['dai'], // Stake Token
			isUniLp: false,
			ratio: 25,
			orchestrator: orchestrator.address,
			halvingDuration: one_day,
			fairDistribution: true,
			fairDistributionTokenLimit: 10000,
			fairDistributionTimeLimit: one_day,
			manualPoolStart: false,
			startTimeOffset: 1
		};

		const debaseDaiLpPoolParams = {
			name: 'Debase/DAI-LP Pool', //name
			rewardToken: dataParse['debase'], // Reward Token
			stakeToken: dataParse['dai'], // Stake Token
			isUniLp: true,
			ratio: 75,
			orchestrator: orchestrator.address,
			halvingDuration: three_days,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: false,
			startTimeOffset: 1
		};

		const degovUsdcPoolParams = {
			name: 'Debase/USDC Pool', //name
			rewardToken: dataParse['degov'], // Reward Token
			stakeToken: dataParse['usdc'], // Stake Token
			isUniLp: false,
			ratio: 25,
			orchestrator: orchestrator.address,
			halvingDuration: two_days,
			fairDistribution: true,
			fairDistributionTokenLimit: 5000,
			fairDistributionTimeLimit: two_days,
			manualPoolStart: true,
			startTimeOffset: 0
		};

		const degovUsdcLpPoolParams = {
			name: 'Debase/USDC-LP Pool', //name
			rewardToken: dataParse['degov'], // Reward Token
			stakeToken: dataParse['usdc'], // Stake Token
			isUniLp: true,
			ratio: 75,
			orchestrator: orchestrator.address,
			halvingDuration: four_days,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: true,
			startTimeOffset: 0
		};

		let transaction = await degov.initialize(dataParse['degovUsdcPool'], 25, dataParse['degovUsdcLpPool'], 75);
		await transaction.wait(1);

		transaction = await debase.initialize(
			dataParse['debaseDaiPool'],
			25,
			dataParse['debaseDaiLpPool'],
			75,
			dataParse['debasePolicy']
		);
		await transaction.wait(1);

		await debasePolicy.initialize(dataParse['debase'], orchestrator.address);

		await debaseDaiPool.initialize(
			debaseDaiPoolParams.name, //name
			debaseDaiPoolParams.rewardToken, // Reward Token
			debaseDaiPoolParams.stakeToken, // Stake Token
			debaseDaiPoolParams.isUniLp,
			debaseDaiPoolParams.orchestrator, // Orchestrator
			debaseDaiPoolParams.ratio, // Pool Ratio
			debaseDaiPoolParams.halvingDuration, // Duration
			debaseDaiPoolParams.fairDistribution, // Fair flag
			debaseDaiPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseDaiPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseDaiPoolParams.manualPoolStart, // Manual start pool
			debaseDaiPoolParams.startTimeOffset // Start Time offset
		);
		await debaseDaiLpPool.initialize(
			debaseDaiLpPoolParams.name, //name
			debaseDaiLpPoolParams.rewardToken, // Reward Token
			debaseDaiLpPoolParams.stakeToken, // Stake Token
			debaseDaiLpPoolParams.isUniLp,
			debaseDaiLpPoolParams.orchestrator,
			debaseDaiLpPoolParams.ratio, // Pool Ratio
			debaseDaiLpPoolParams.halvingDuration, // Duration
			debaseDaiLpPoolParams.fairDistribution, // Fair flag
			debaseDaiLpPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseDaiLpPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseDaiLpPoolParams.manualPoolStart, // Manual start pool
			debaseDaiLpPoolParams.startTimeOffset // Start Time offset
		);
		await degovUsdcPool.initialize(
			degovUsdcPoolParams.name, //name
			degovUsdcPoolParams.rewardToken, // Reward Token
			degovUsdcPoolParams.stakeToken, // Stake Token
			degovUsdcPoolParams.isUniLp,
			degovUsdcPoolParams.orchestrator,
			degovUsdcPoolParams.ratio, // Pool Ratio
			degovUsdcPoolParams.halvingDuration, // Duration
			degovUsdcPoolParams.fairDistribution, // Fair flag
			degovUsdcPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUsdcPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUsdcPoolParams.manualPoolStart, // Manual start pool
			degovUsdcPoolParams.startTimeOffset // Start Time offset
		);

		await degovUsdcLpPool.initialize(
			degovUsdcLpPoolParams.name, //name
			degovUsdcLpPoolParams.rewardToken, // Reward Token
			degovUsdcLpPoolParams.stakeToken, // Stake Token
			degovUsdcLpPoolParams.isUniLp,
			degovUsdcLpPoolParams.orchestrator,
			degovUsdcLpPoolParams.ratio, // Pool Ratio
			degovUsdcLpPoolParams.halvingDuration, // Duration
			degovUsdcLpPoolParams.fairDistribution, // Fair flag
			degovUsdcLpPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUsdcLpPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUsdcLpPoolParams.manualPoolStart, // Manual start pool
			degovUsdcLpPoolParams.startTimeOffset // Start Time offset
		);
		await governorAlpha.initialize(timelock.address, dataParse['degov']);
		await timelock.initialize(governorAlpha.address);
		await orchestrator.initialize(
			dataParse['debase'],
			debasePolicy.address,
			debaseDaiPool.address,
			debaseDaiLpPool.address,
			degovUsdcPool.address,
			degovUsdcLpPool.address,
			rebaseRequiredSupplyRatio,
			three_weeks
		);

		await orchestrator.addPair(dataParse['debase'], dataParse['dai']);
		await orchestrator.addPair(dataParse['debase'], WETH[1].address);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
