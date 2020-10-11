import { run, ethers } from '@nomiclabs/buidler';
import { FACTORY_ADDRESS, INIT_CODE_HASH, WETH } from '@uniswap/sdk';
import { pack, keccak256 } from '@ethersproject/solidity';
import { getCreate2Address } from '@ethersproject/address';

import DegovArtifact from '../artifacts/Degov.json';
import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';

import StakingPoolArtifact from '../artifacts/StakingPool.json';

import DebaseArtifact from '../artifacts/Debase.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';

import USDCArtifact from '../artifacts/USDC.json';
import YCurveArtifact from '../artifacts/YCurve.json';
import UNIArtifact from '../artifacts/UNI.json';

import { DegovFactory } from '../type/DegovFactory';
import { GovernorAlphaFactory } from '../type/GovernorAlphaFactory';
import { TimelockFactory } from '../type/TimelockFactory';

import { StakingPoolFactory } from '../type/StakingPoolFactory';

import { DebaseFactory } from '../type/DebaseFactory';
import { DebasePolicyFactory } from '../type/DebasePolicyFactory';
import { OrchestratorFactory } from '../type/OrchestratorFactory';

import { UsdcFactory } from '../type/UsdcFactory';
import { YCurveFactory } from '../type/YCurveFactory';
import { UniFactory } from '../type/UniFactory';
import { promises } from 'fs';

async function main() {
	await run('typechain');
	const signer = await ethers.getSigners();

	const degovFactory = (new ethers.ContractFactory(
		DegovArtifact.abi,
		DegovArtifact.bytecode,
		signer[0]
	) as any) as DegovFactory;
	const governorAlphaFactory = (new ethers.ContractFactory(
		GovernorAlphaArtifact.abi,
		GovernorAlphaArtifact.bytecode,
		signer[0]
	) as any) as GovernorAlphaFactory;
	const timeLockFactory = (new ethers.ContractFactory(
		TimelockArtifact.abi,
		TimelockArtifact.bytecode,
		signer[0]
	) as any) as TimelockFactory;
	const stakingPoolFactory = (new ethers.ContractFactory(
		StakingPoolArtifact.abi,
		StakingPoolArtifact.bytecode,
		signer[0]
	) as any) as StakingPoolFactory;
	const debaseFactory = (new ethers.ContractFactory(
		DebaseArtifact.abi,
		DebaseArtifact.bytecode,
		signer[0]
	) as any) as DebaseFactory;
	const debasePolicyFactory = (new ethers.ContractFactory(
		DebasePolicyArtifact.abi,
		DebasePolicyArtifact.bytecode,
		signer[0]
	) as any) as DebasePolicyFactory;
	const orchestratorFactory = (new ethers.ContractFactory(
		OrchestratorArtifact.abi,
		OrchestratorArtifact.bytecode,
		signer[0]
	) as any) as OrchestratorFactory;
	const USDCFactory = (new ethers.ContractFactory(
		USDCArtifact.abi,
		USDCArtifact.bytecode,
		signer[0]
	) as any) as UsdcFactory;
	const YCurveFactory = (new ethers.ContractFactory(
		YCurveArtifact.abi,
		YCurveArtifact.bytecode,
		signer[0]
	) as any) as YCurveFactory;
	const uniFactory = (new ethers.ContractFactory(
		UNIArtifact.abi,
		UNIArtifact.bytecode,
		signer[0]
	) as any) as UniFactory;

	let balance = (await signer[0].getBalance()).toString();
	console.log('Balance before deploy', ethers.utils.formatEther(balance));

	let contractAddresses = {
		degov: '',
		debase: '',
		debasePolicy: '',
		governorAlpha: '',
		timelock: '',
		debaseUSDCPool: '',
		debaseYCurvePool: '',
		degovUNIPool: '',
		orchestrator: '',
		USDC: '',
		YCurve: '',
		UNI: '',
		debaseUSDCLP: ''
	};

	try {
		const degov = await degovFactory.deploy();
		const debase = await debaseFactory.deploy();

		const debasePolicy = await debasePolicyFactory.deploy();
		const governorAlpha = await governorAlphaFactory.deploy();
		const timelock = await timeLockFactory.deploy();
		const orchestrator = await orchestratorFactory.deploy();

		const debaseUSDCPool = await stakingPoolFactory.deploy();
		const debaseYCurvePool = await stakingPoolFactory.deploy();
		const degovUNIPool = await stakingPoolFactory.deploy();

		const USDC = await USDCFactory.deploy(ethers.utils.parseEther('10000'));
		const YCurve = await YCurveFactory.deploy(ethers.utils.parseEther('10000'));
		const UNI = await uniFactory.deploy(ethers.utils.parseEther('10000'));

		balance = (await signer[0].getBalance()).toString();
		console.log('Balance after deploy', ethers.utils.formatEther(balance));

		const debaseUSDCLP = getCreate2Address(
			'0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
			keccak256([ 'bytes' ], [ pack([ 'address', 'address' ], [ debase.address, USDC.address ]) ]),
			INIT_CODE_HASH
		);

		console.log('Addr', debaseUSDCLP, debase.address, USDC.address);

		contractAddresses.degov = degov.address;
		contractAddresses.debase = debase.address;

		contractAddresses.debasePolicy = debasePolicy.address;
		contractAddresses.governorAlpha = governorAlpha.address;
		contractAddresses.timelock = timelock.address;
		contractAddresses.orchestrator = orchestrator.address;

		contractAddresses.debaseUSDCPool = debaseUSDCPool.address;
		contractAddresses.debaseYCurvePool = debaseYCurvePool.address;
		contractAddresses.degovUNIPool = degovUNIPool.address;

		contractAddresses.USDC = USDC.address;
		contractAddresses.YCurve = YCurve.address;
		contractAddresses.UNI = UNI.address;

		contractAddresses.debaseUSDCLP = debaseUSDCLP;

		const data = JSON.stringify(contractAddresses);
		await promises.writeFile('contracts.json', data);
		console.log('JSON data is saved.');
	} catch (error) {
		console.error(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
