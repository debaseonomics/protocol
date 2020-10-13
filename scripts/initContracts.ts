import { run, ethers } from '@nomiclabs/buidler';

import DegovArtifact from '../artifacts/Degov.json';
import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';
import StakingPoolArtifact from '../artifacts/StakingPool.json';
import DebaseArtifact from '../artifacts/Debase.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';

import { Degov } from '../type/Degov';
import { GovernorAlpha } from '../type/GovernorAlpha';
import { Timelock } from '../type/Timelock';
import { StakingPool } from '../type/StakingPool';
import { Debase } from '../type/Debase';
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

		const degovUniPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovUniPool'],
			signer[0]
		)) as any) as StakingPool;

		const degovUniLpPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovUniLpPool'],
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

		const UNI = dataParse['UNI'];
		const DAI = dataParse['DAI'];

		const debaseDaiLp = dataParse['debaseDaiLp'];
		const degovUniLp = dataParse['degovUniLp'];

		const one_hour = 60 * 60;
		const one_day = 24 * one_hour;
		const two_days = 2 * one_day;
		const three_days = 3 * one_day;
		const four_days = 4 * one_day;
		const three_weeks = 21 * one_day;

		const rebaseRequiredSupplyRatio = 95;

		const debaseDaiPoolParams = {
			name: 'Debase/DAI Pool', //name
			rewardToken: debase.address, // Reward Token
			stakeToken: DAI, // Stake Token
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
			rewardToken: debase.address, // Reward Token
			stakeToken: debaseDaiLp, // Stake Token
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

		const degovUniPoolParams = {
			name: 'Debase/UNI Pool', //name
			rewardToken: degov.address, // Reward Token
			stakeToken: UNI, // Stake Token
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

		const degovUniLpPoolParams = {
			name: 'Debase/UNI-LP Pool', //name
			rewardToken: degov.address, // Reward Token
			stakeToken: degovUniLp, // Stake Token
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

		let transaction = await degov.initialize(degovUniPool.address);
		await transaction.wait(1);

		transaction = await debase.initialize(
			debaseDaiPool.address,
			debaseDaiPoolParams.ratio,
			debaseDaiLpPool.address,
			debaseDaiLpPoolParams.ratio,
			debasePolicy.address
		);
		await transaction.wait(1);

		await debasePolicy.initialize(debase.address, orchestrator.address);

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
		await degovUniPool.initialize(
			degovUniPoolParams.name, //name
			degovUniPoolParams.rewardToken, // Reward Token
			degovUniPoolParams.stakeToken, // Stake Token
			degovUniPoolParams.isUniLp,
			degovUniPoolParams.orchestrator,
			degovUniPoolParams.ratio, // Pool Ratio
			degovUniPoolParams.halvingDuration, // Duration
			degovUniPoolParams.fairDistribution, // Fair flag
			degovUniPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUniPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUniPoolParams.manualPoolStart, // Manual start pool
			degovUniPoolParams.startTimeOffset // Start Time offset
		);

		await degovUniPool.initialize(
			degovUniPoolParams.name, //name
			degovUniPoolParams.rewardToken, // Reward Token
			degovUniPoolParams.stakeToken, // Stake Token
			degovUniPoolParams.isUniLp,
			degovUniPoolParams.orchestrator,
			degovUniPoolParams.ratio, // Pool Ratio
			degovUniPoolParams.halvingDuration, // Duration
			degovUniPoolParams.fairDistribution, // Fair flag
			degovUniPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUniPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUniPoolParams.manualPoolStart, // Manual start pool
			degovUniPoolParams.startTimeOffset // Start Time offset
		);

		await degovUniLpPool.initialize(
			degovUniLpPoolParams.name, //name
			degovUniLpPoolParams.rewardToken, // Reward Token
			degovUniLpPoolParams.stakeToken, // Stake Token
			degovUniLpPoolParams.isUniLp,
			degovUniLpPoolParams.orchestrator,
			degovUniLpPoolParams.ratio, // Pool Ratio
			degovUniLpPoolParams.halvingDuration, // Duration
			degovUniLpPoolParams.fairDistribution, // Fair flag
			degovUniLpPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUniLpPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUniLpPoolParams.manualPoolStart, // Manual start pool
			degovUniLpPoolParams.startTimeOffset // Start Time offset
		);
		await governorAlpha.initialize(timelock.address, degov.address);
		await timelock.initialize(governorAlpha.address);
		await orchestrator.initialize(
			debase.address,
			debasePolicy.address,
			debaseDaiPool.address,
			debaseDaiLpPool.address,
			degovUniPool.address,
			degovUniLpPool.address,
			rebaseRequiredSupplyRatio,
			three_weeks
		);

		await orchestrator.addPair(debase.address, DAI);
		await orchestrator.addPair(debase.address, WETH[1].address);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
