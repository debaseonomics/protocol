import { run, ethers } from '@nomiclabs/buidler';
import { FACTORY_ADDRESS, INIT_CODE_HASH } from '@uniswap/sdk';
import { pack, keccak256 } from '@ethersproject/solidity';
import { getCreate2Address } from '@ethersproject/address';

import DegovArtifact from '../artifacts/Degov.json';
import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';

import StakingPoolArtifact from '../artifacts/StakingPool.json';

import DebaseArtifact from '../artifacts/Debase.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';

import { DegovFactory } from '../type/DegovFactory';
import { GovernorAlphaFactory } from '../type/GovernorAlphaFactory';
import { TimelockFactory } from '../type/TimelockFactory';

import { StakingPoolFactory } from '../type/StakingPoolFactory';

import { DebaseFactory } from '../type/DebaseFactory';
import { DebasePolicyFactory } from '../type/DebasePolicyFactory';
import { OrchestratorFactory } from '../type/OrchestratorFactory';

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

	let balance = (await signer[0].getBalance()).toString();
	console.log('Balance before deploy', ethers.utils.formatEther(balance));

	let contractAddresses = {
		degov: '',
		debase: '',
		debasePolicy: '',
		governorAlpha: '',
		timelock: '',
		debaseDAIPool: '',
		debaseYCurvePool: '',
		degovUNIPool: '',
		orchestrator: '',
		DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
		YCurve: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8',
		UNI: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
		debaseDAILP: ''
	};

	try {
		const degov = await degovFactory.deploy();
		const debase = await debaseFactory.deploy();

		const debasePolicy = await debasePolicyFactory.deploy();
		const governorAlpha = await governorAlphaFactory.deploy();
		const timelock = await timeLockFactory.deploy();
		const orchestrator = await orchestratorFactory.deploy();

		const debaseDAIPool = await stakingPoolFactory.deploy();
		const debaseYCurvePool = await stakingPoolFactory.deploy();
		const degovUNIPool = await stakingPoolFactory.deploy();

		balance = (await signer[0].getBalance()).toString();
		console.log('Balance after deploy', ethers.utils.formatEther(balance));

		const debaseDAILP = getCreate2Address(
			FACTORY_ADDRESS,
			keccak256([ 'bytes' ], [ pack([ 'address', 'address' ], [ debase.address, contractAddresses.DAI ]) ]),
			INIT_CODE_HASH
		);

		contractAddresses.degov = degov.address;
		contractAddresses.debase = debase.address;

		contractAddresses.debasePolicy = debasePolicy.address;
		contractAddresses.governorAlpha = governorAlpha.address;
		contractAddresses.timelock = timelock.address;
		contractAddresses.orchestrator = orchestrator.address;

		contractAddresses.debaseDAIPool = debaseDAIPool.address;
		contractAddresses.debaseYCurvePool = debaseYCurvePool.address;
		contractAddresses.degovUNIPool = degovUNIPool.address;

		contractAddresses.debaseDAILP = debaseDAILP;

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
