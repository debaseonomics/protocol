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

		const degovDaiLpPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovDaiLpPool'],
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
		const three_days = 3 * one_day;
		const one_week = 7 * one_day;
		const three_weeks = 21 * one_day;

		const rebaseRequiredSupply_ = parseEther('95000');

		const debaseDaiPoolParams = {
			name: 'Debase/DAI Pool', //name
			rewardToken: debase.address, // Reward Token
			pairToken: dataParse['dai'], // Stake Token
			isUniLp: false,
			orchestrator: orchestrator.address,
			halvingDuration: one_day,
			fairDistribution: true,
			fairDistributionTokenLimit: 10000,
			fairDistributionTimeLimit: one_day,
			manualPoolStart: false,
			startTimeOffset: one_hour
		};

		const debaseDaiLpPoolParams = {
			name: 'Debase/DAI-LP Pool', //name
			rewardToken: debase.address, // Reward Token
			pairToken: dataParse['dai'], // Stake Token
			isUniLp: true,
			orchestrator: orchestrator.address,
			halvingDuration: three_days,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: false,
			startTimeOffset: one_hour
		};

		let transaction = await degov.initialize(degovDaiLpPool.address);
		await transaction.wait(1);

		transaction = await debase.initialize(
			debaseDaiPool.address,
			3,
			debaseDaiLpPool.address,
			7,
			debasePolicy.address,
			90
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

		await transaction.wait(1);
		const lp = await debaseDaiLpPool.y();

		const degovDaiLpPoolParams = {
			name: 'Degov/Dai-Lp Pool', //name
			rewardToken: degov.address, // Reward Token
			pairToken: lp, // Stake Token
			isUniLp: false,
			orchestrator: orchestrator.address,
			halvingDuration: one_week,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: true,
			startTimeOffset: 0
		};

		transaction = await degovDaiLpPool.initialize(
			degovDaiLpPoolParams.name, //name
			degovDaiLpPoolParams.rewardToken, // Reward Token
			degovDaiLpPoolParams.pairToken, // Stake Token
			degovDaiLpPoolParams.isUniLp,
			degovDaiLpPoolParams.orchestrator,
			degovDaiLpPoolParams.halvingDuration, // Duration
			degovDaiLpPoolParams.fairDistribution, // Fair flag
			degovDaiLpPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovDaiLpPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovDaiLpPoolParams.manualPoolStart, // Manual start pool
			degovDaiLpPoolParams.startTimeOffset // Start Time offset
		);

		await governorAlpha.initialize(timelock.address, degov.address);

		await timelock.initialize(governorAlpha.address);

		transaction = await orchestrator.initialize(
			debase.address,
			debasePolicy.address,
			debaseDaiPool.address,
			debaseDaiLpPool.address,
			degovDaiLpPool.address,
			rebaseRequiredSupply_,
			three_weeks
		);

		transaction.wait(1);

		await orchestrator.addUniPair(debase.address, dataParse['dai']);

		dataParse['debaseDaiLp'] = lp;
		const updatedData = JSON.stringify(dataParse);
		await promises.writeFile('contracts.json', updatedData);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
