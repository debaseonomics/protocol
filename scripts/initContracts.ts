import { run, ethers } from '@nomiclabs/buidler';

import DegovArtifact from '../artifacts/Degov.json';
import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';

import StakingPoolArtifact from '../artifacts/StakingPool.json';
import UNIArtifact from '../artifacts/UNI.json';

import DebaseArtifact from '../artifacts/Debase.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';
import USDCArtifact from '../artifacts/USDC.json';
import YCurveArtifact from '../artifacts/YCurve.json';

import { Degov } from '../type/Degov';
import { GovernorAlpha } from '../type/GovernorAlpha';
import { Timelock } from '../type/Timelock';

import { StakingPool } from '../type/StakingPool';

import { Debase } from '../type/Debase';
import { DebasePolicy } from '../type/DebasePolicy';
import { Orchestrator } from '../type/Orchestrator';
import { Uni } from '../type/Uni';
import { Usdc } from '../type/Usdc';
import { YCurve } from '../type/YCurve';
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

		const debaseUSDCPool = ((await ethers.getContractAt(
			StakingPoolArtifact.abi,
			dataParse['debaseUSDCPool'],
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
		const usdc = ((await ethers.getContractAt(USDCArtifact.abi, dataParse['USDC'], signer[0])) as any) as Usdc;
		const yCurve = ((await ethers.getContractAt(
			YCurveArtifact.abi,
			dataParse['YCurve'],
			signer[0]
		)) as any) as YCurve;
		const uni = ((await ethers.getContractAt(UNIArtifact.abi, dataParse['UNI'], signer[0])) as any) as Uni;
		const debaseUSDCLP = dataParse['debaseUSDCLP'];

		// const weth = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
		const two_hour = 2 * 60 * 60;
		const four_hour = 4 * 60 * 60;
		const one_day = 24 * 60 * 60;
		const two_days = 48 * 60 * 60;
		const three_days = 72 * 60 * 60;
		const four_days = 96 * 60 * 60;
		const three_weeks = 21 * one_day;
		const rebaseRequiredSupplyRatio = 1;

		const debaseYCurvePoolParams = {
			ratio: 25,
			halvingDuration: four_hour,
			fairDistribution: true,
			fairDistributionTokenLimit: 10000,
			fairDistributionTimeLimit: one_day,
			manualPoolStart: false,
			startTimeOffset: 1
		};

		const debaseUSDCPoolParams = {
			ratio: 75,
			halvingDuration: four_hour,
			fairDistribution: false,
			fairDistributionTokenLimit: 0,
			fairDistributionTimeLimit: 0,
			manualPoolStart: false,
			startTimeOffset: two_hour
		};

		const degovUNIPoolParams = {
			ratio: 100,
			halvingDuration: four_days,
			fairDistribution: true,
			fairDistributionTokenLimit: 5000,
			fairDistributionTimeLimit: two_days,
			manualPoolStart: true,
			startTimeOffset: two_hour
		};

		let balance = (await signer[0].getBalance()).toString();
		console.log('Balance before init', ethers.utils.formatEther(balance));

		let transaction = await degov.initialize(degovUNIPool.address);
		transaction.wait(1);
		transaction = await debase.initialize(
			debaseYCurvePool.address,
			debaseYCurvePoolParams.ratio,
			debaseUSDCPool.address,
			debaseUSDCPoolParams.ratio,
			debasePolicy.address
		);
		transaction.wait(1);

		await debasePolicy.initialize(debase.address, orchestrator.address);
		await debaseYCurvePool.initialize(
			'Debase/YCurve Pool', //name
			debase.address, // Reward Token
			yCurve.address, // Stake Token
			orchestrator.address, // Orchestrator
			debaseYCurvePoolParams.ratio, // Pool Ratio
			debaseYCurvePoolParams.halvingDuration, // Duration
			debaseYCurvePoolParams.fairDistribution, // Fair flag
			debaseYCurvePoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseYCurvePoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseYCurvePoolParams.manualPoolStart, // Manual start pool
			debaseYCurvePoolParams.startTimeOffset // Start Time offset
		);
		await debaseUSDCPool.initialize(
			'Debase/USDC Pool',
			debase.address,
			debaseUSDCLP,
			orchestrator.address,
			debaseUSDCPoolParams.ratio, // Pool Ratio
			debaseUSDCPoolParams.halvingDuration, // Duration
			debaseUSDCPoolParams.fairDistribution, // Fair flag
			debaseUSDCPoolParams.fairDistributionTokenLimit, // Fair token limit
			debaseUSDCPoolParams.fairDistributionTimeLimit, // Fair token time limit
			debaseUSDCPoolParams.manualPoolStart, // Manual start pool
			debaseUSDCPoolParams.startTimeOffset // Start Time offset
		);
		await degovUNIPool.initialize(
			'Degov/UNI Pool',
			degov.address,
			uni.address,
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
			debaseUSDCPool.address,
			degovUNIPool.address,
			rebaseRequiredSupplyRatio,
			three_weeks
		);

		await orchestrator.addPair(debase.address, usdc.address);
		await orchestrator.addPair(debase.address, yCurve.address);
		await orchestrator.addPair(debase.address, WETH[4].address);

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
