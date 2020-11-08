
import { run, ethers } from "hardhat";

import DegovArtifact from '../artifacts/contracts/flattened/Degov.sol/Degov.json';
import GovernorAlphaArtifact from '../artifacts/contracts/flattened/GovernorAlpha.sol/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/contracts/flattened/Timelock.sol/Timelock.json';
import StakingPoolArtifact from '../artifacts/contracts/flattened/StakingPool.sol/StakingPool.json';
import StabilizerPoolArtifact from '../artifacts/contracts/flattened/StabilizerPool.sol/StabilizerPool.json';
import DebaseArtifact from '../artifacts/contracts/flattened/Debase.sol/Debase.json';
import DebasePolicyArtifact from '../artifacts/contracts/flattened/DebasePolicy.sol/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/contracts/flattened/Orchrestrator.sol/Orchestrator.json';

import { DegovFactory } from '../type/DegovFactory';
import { GovernorAlphaFactory } from '../type/GovernorAlphaFactory';
import { TimelockFactory } from '../type/TimelockFactory';

import { StakingPoolFactory } from '../type/StakingPoolFactory';
import { StabilizerPoolFactory } from '../type/StabilizerPoolFactory';

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

	const stabilizerPoolFactory = (new ethers.ContractFactory(
		StabilizerPoolArtifact.abi,
		StabilizerPoolArtifact.bytecode,
		signer[0]
	) as any) as StabilizerPoolFactory;

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
		debaseDaiPool: '',
		debaseDaiLpPool: '',
		degovDaiLpPool: '',
		orchestrator: '',
		dai: '0x6b175474e89094c44da98b954eedeac495271d0f',
		debaseDaiLp: '',
		oracle: '',
		stabilizerPool: ''
	};

	try {
		const degov = await degovFactory.deploy();
		const debase = await debaseFactory.deploy();

		const debasePolicy = await debasePolicyFactory.deploy();
		const governorAlpha = await governorAlphaFactory.deploy();
		const timelock = await timeLockFactory.deploy();
		const orchestrator = await orchestratorFactory.deploy();

		const debaseDaiPool = await stakingPoolFactory.deploy();
		const debaseDaiLpPool = await stakingPoolFactory.deploy();
		const degovDaiLpPool = await stakingPoolFactory.deploy();
		const stabilizerPool = await stabilizerPoolFactory.deploy();

		contractAddresses.degov = degov.address;
		contractAddresses.debase = debase.address;

		contractAddresses.debasePolicy = debasePolicy.address;
		contractAddresses.governorAlpha = governorAlpha.address;
		contractAddresses.timelock = timelock.address;
		contractAddresses.orchestrator = orchestrator.address;

		contractAddresses.debaseDaiPool = debaseDaiPool.address;
		contractAddresses.debaseDaiLpPool = debaseDaiLpPool.address;
		contractAddresses.degovDaiLpPool = degovDaiLpPool.address;
		contractAddresses.stabilizerPool = stabilizerPool.address;

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
