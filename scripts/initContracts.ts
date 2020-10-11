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

		const debaseDAIPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['debaseDAIPool'],
			signer[0]
		)) as any) as StakingPool;
		const debaseYCurvePool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['debaseYCurvePool'],
			signer[0]
		)) as any) as StakingPool;
		const degovUNIPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['degovUNIPool'],
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
		const YCurve = dataParse['YCurve'];
		const DAI = dataParse['DAI'];
		const debaseDAILP = dataParse['debaseDAILP'];

		const one_hour = 60 * 60;
		const one_day = 24 * one_hour;
		const two_days = 2 * one_day;
		const three_days = 3 * one_day;
		const four_days = 4 * one_day;
		const three_weeks = 21 * one_day;
		const rebaseRequiredSupplyRatio = 1;

		const debaseYCurvePoolParams = {
			ratio: 25,
			halvingDuration: one_day,
			fairDistribution: true,
			fairDistributionTokenLimit: 10000,
			fairDistributionTimeLimit: one_day,
			manualPoolStart: false,
			startTimeOffset: one_hour
		};

		const debaseDAIPoolParams = {
			ratio: 75,
			halvingDuration: three_days,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: false,
			startTimeOffset: one_hour
		};

		const degovUNIPoolParams = {
			ratio: 100,
			halvingDuration: four_days,
			fairDistribution: true,
			fairDistributionTokenLimit: 5000,
			fairDistributionTimeLimit: two_days,
			manualPoolStart: true,
			startTimeOffset: 0
		};

		let balance = (await signer[0].getBalance()).toString();
		console.log('Balance before init', ethers.utils.formatEther(balance));

		let transaction = await degov.initialize(degovUNIPool.address);
		transaction.wait(1);
		transaction = await debase.initialize(
			debaseYCurvePool.address,
			debaseYCurvePoolParams.ratio,
			debaseDAIPool.address,
			debaseDAIPoolParams.ratio,
			debasePolicy.address
		);
		transaction.wait(1);

		await debasePolicy.initialize(debase.address, orchestrator.address);
		await debaseYCurvePool.initialize(
			'Debase/YCurve Pool', //name
			debase.address, // Reward Token
			YCurve, // Stake Token
			orchestrator.address, // Orchestrator
			debaseYCurvePoolParams.ratio, // Pool Ratio
			debaseYCurvePoolParams.halvingDuration, // Duration
			debaseYCurvePoolParams.fairDistribution, // Fair flag
			debaseYCurvePoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseYCurvePoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseYCurvePoolParams.manualPoolStart, // Manual start pool
			debaseYCurvePoolParams.startTimeOffset // Start Time offset
		);
		await debaseDAIPool.initialize(
			'Debase/DAI Pool',
			debase.address,
			debaseDAILP,
			orchestrator.address,
			debaseDAIPoolParams.ratio, // Pool Ratio
			debaseDAIPoolParams.halvingDuration, // Duration
			debaseDAIPoolParams.fairDistribution, // Fair flag
			debaseDAIPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseDAIPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseDAIPoolParams.manualPoolStart, // Manual start pool
			debaseDAIPoolParams.startTimeOffset // Start Time offset
		);
		await degovUNIPool.initialize(
			'Degov/UNI Pool',
			degov.address,
			UNI,
			orchestrator.address,
			degovUNIPoolParams.ratio, // Pool Ratio
			degovUNIPoolParams.halvingDuration, // Duration
			degovUNIPoolParams.fairDistribution, // Fair flag
			degovUNIPoolParams.fairDistributionTokenLimit, // Fair token limit
			degovUNIPoolParams.fairDistributionTimeLimit, // Fair token time limit
			degovUNIPoolParams.manualPoolStart, // Manual start pool
			degovUNIPoolParams.startTimeOffset // Start Time offset
		);
		await governorAlpha.initialize(timelock.address, degov.address);
		await timelock.initialize(governorAlpha.address);
		await orchestrator.initialize(
			debase.address,
			debasePolicy.address,
			debaseYCurvePool.address,
			debaseDAIPool.address,
			degovUNIPool.address,
			rebaseRequiredSupplyRatio,
			three_weeks
		);

		await orchestrator.addPair(debase.address, DAI);
		await orchestrator.addPair(debase.address, YCurve);
		await orchestrator.addPair(debase.address, WETH[1].address);

		balance = (await signer[0].getBalance()).toString();
		console.log('Balance after init', ethers.utils.formatEther(balance));
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
