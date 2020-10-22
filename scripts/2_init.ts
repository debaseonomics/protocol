import { run, ethers } from '@nomiclabs/buidler';

import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';
import StakingPoolArtifact from '../artifacts/StakingPool.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';
import DegovArtifact from '../artifacts/Degov.json';
import DebaseArtifact from '../artifacts/Debase.json';
import StabilizerPoolArtifact from '../artifacts/StabilizerPool.json';

import { Degov } from '../type/Degov';
import { Debase } from '../type/Debase';
import { GovernorAlpha } from '../type/GovernorAlpha';
import { Timelock } from '../type/Timelock';
import { StakingPool } from '../type/StakingPool';
import { StabilizerPool } from '../type/StabilizerPool';
import { DebasePolicy } from '../type/DebasePolicy';
import { Orchestrator } from '../type/Orchestrator';
import { promises } from 'fs';
import { parseEther } from 'ethers/lib/utils';

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

		const degovDebasePool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovDebasePool'],
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

		const debaseDaiLpStabilizerPool = ((await ethers.getContractAt(
			StabilizerPoolArtifact.abi,
			dataParse['debaseDaiLpStabilizerPool'],
			signer[0]
		)) as any) as StabilizerPool;

		const min_5 = 5 * 60;
		const min_30 = 30 * 60;
		const one_hour = 60 * 60;
		const two_hour = 2 * one_hour;
		const four_hour = 4 * one_hour;
		const one_day = 24 * one_hour;
		const two_days = 2 * one_day;
		const three_days = 3 * one_day;
		const four_days = 4 * one_day;
		const three_weeks = 21 * one_day;

		const rebaseRequiredSupply_ = parseEther('500');

		const debaseDaiPoolParams = {
			name: 'Debase/DAI Pool', //name
			rewardToken: debase.address, // Reward Token
			pairToken: dataParse['dai'], // Stake Token
			isUniLp: false,
			orchestrator: orchestrator.address,
			halvingDuration: one_hour,
			fairDistribution: true,
			fairDistributionTokenLimit: 10000,
			fairDistributionTimeLimit: one_day,
			manualPoolStart: false,
			startTimeOffset: 1
		};

		const debaseDaiLpPoolParams = {
			name: 'Debase/DAI-LP Pool', //name
			rewardToken: debase.address, // Reward Token
			pairToken: dataParse['dai'], // Stake Token
			isUniLp: true,
			orchestrator: orchestrator.address,
			halvingDuration: two_hour,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: false,
			startTimeOffset: 1
		};

		const degovDebasePoolParams = {
			name: 'Degov/Debase Pool', //name
			rewardToken: degov.address, // Reward Token
			pairToken: debase.address, // Stake Token
			isUniLp: false,
			orchestrator: orchestrator.address,
			halvingDuration: two_hour,
			fairDistribution: true,
			fairDistributionTokenLimit: 5000,
			fairDistributionTimeLimit: two_days,
			manualPoolStart: true,
			startTimeOffset: 0
		};

		const debaseDaiLpStabilizerPoolParams = {
			name: 'Debase/DAI-LP Pool', //name
			rewardToken: debase.address, // Reward Token
			pairToken: dataParse['dai'], // Stake Token
			policy: debasePolicy.address,
			rewardAmount: parseEther('1000'),
			duration: one_hour
		};

		let transaction = await degov.initialize(degovDebasePool.address);
		await transaction.wait(1);

		transaction = await debase.initialize(
			debaseDaiPool.address,
			10,
			debaseDaiLpPool.address,
			30,
			debasePolicy.address,
			60
		);
		await transaction.wait(1);

		await debasePolicy.initialize(debase.address, orchestrator.address);

		await debaseDaiPool.initialize(
			debaseDaiPoolParams.name, //name
			debaseDaiPoolParams.rewardToken, // Reward Token
			debaseDaiPoolParams.pairToken, // Stake Token
			debaseDaiPoolParams.isUniLp,
			debaseDaiPoolParams.orchestrator, // Orchestrator
			debaseDaiPoolParams.halvingDuration, // Duration
			debaseDaiPoolParams.fairDistribution, // Fair flag
			debaseDaiPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseDaiPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseDaiPoolParams.manualPoolStart, // Manual start pool
			debaseDaiPoolParams.startTimeOffset // Start Time offset
		);
		transaction = await debaseDaiLpPool.initialize(
			debaseDaiLpPoolParams.name, //name
			debaseDaiLpPoolParams.rewardToken, // Reward Token
			debaseDaiLpPoolParams.pairToken, // Stake Token
			debaseDaiLpPoolParams.isUniLp,
			debaseDaiLpPoolParams.orchestrator,
			debaseDaiLpPoolParams.halvingDuration, // Duration
			debaseDaiLpPoolParams.fairDistribution, // Fair flag
			debaseDaiLpPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseDaiLpPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseDaiLpPoolParams.manualPoolStart, // Manual start pool
			debaseDaiLpPoolParams.startTimeOffset // Start Time offset
		);

		await degovDebasePool.initialize(
			degovDebasePoolParams.name, //name
			degovDebasePoolParams.rewardToken, // Reward Token
			degovDebasePoolParams.pairToken, // Stake Token
			degovDebasePoolParams.isUniLp,
			degovDebasePoolParams.orchestrator,
			degovDebasePoolParams.halvingDuration, // Duration
			degovDebasePoolParams.fairDistribution, // Fair flag
			degovDebasePoolParams.fairDistributionTokenLimit, // Fair token limit
			degovDebasePoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovDebasePoolParams.manualPoolStart, // Manual start pool
			degovDebasePoolParams.startTimeOffset // Start Time offset
		);

		await debaseDaiLpStabilizerPool.initialize(
			debaseDaiLpStabilizerPoolParams.name,
			debaseDaiLpStabilizerPoolParams.rewardToken,
			debaseDaiLpStabilizerPoolParams.pairToken,
			debaseDaiLpStabilizerPoolParams.policy,
			debaseDaiLpStabilizerPoolParams.rewardAmount,
			debaseDaiLpStabilizerPoolParams.duration
		);

		await governorAlpha.initialize(timelock.address, degov.address);

		await timelock.initialize(governorAlpha.address);

		transaction = await orchestrator.initialize(
			debase.address,
			debasePolicy.address,
			debaseDaiPool.address,
			debaseDaiLpPool.address,
			degovDebasePool.address,
			rebaseRequiredSupply_,
			three_weeks
		);

		transaction.wait(1);

		await orchestrator.addPair(debase.address, dataParse['dai']);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
