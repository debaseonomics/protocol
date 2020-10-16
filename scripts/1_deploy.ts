import { run, ethers } from '@nomiclabs/buidler';

import DegovArtifact from '../artifacts/Degov.json';
import GovernorAlphaArtifact from '../artifacts/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/Timelock.json';
import TokenArtifact from '../artifacts/Token.json';

import StakingPoolArtifact from '../artifacts/StakingPool.json';

import DebaseArtifact from '../artifacts/Debase.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/Orchestrator.json';

import { TokenFactory } from '../type/TokenFactory';
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
	const acc = await signer[0].getAddress();
	console.log(acc);

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

	const tokenFactory = (new ethers.ContractFactory(
		TokenArtifact.abi,
		TokenArtifact.bytecode,
		signer[0]
	) as any) as TokenFactory;

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
		degovUsdcPool: '',
		degovUsdcLpPool: '',
		orchestrator: '',
		dai: '',
		usdc: '',
		debaseDaiLp: '',
		degovUsdcLp: '',
		oracle: ''
	};

	try {
		const dai = await tokenFactory.deploy('DAI', 'DAI', 18);
		const usdc = await tokenFactory.deploy('USDC', 'USDC', 18);

		const degov = await degovFactory.deploy();
		const debase = await debaseFactory.deploy();

		const debasePolicy = await debasePolicyFactory.deploy();
		const governorAlpha = await governorAlphaFactory.deploy();
		const timelock = await timeLockFactory.deploy();
		const orchestrator = await orchestratorFactory.deploy();

		const debaseDaiPool = await stakingPoolFactory.deploy();
		const debaseDaiLpPool = await stakingPoolFactory.deploy();
		const degovUsdcPool = await stakingPoolFactory.deploy();
		const degovUsdcLpPool = await stakingPoolFactory.deploy();

		contractAddresses.dai = dai.address;
		contractAddresses.usdc = usdc.address;

		contractAddresses.degov = degov.address;
		contractAddresses.debase = debase.address;

		contractAddresses.debasePolicy = debasePolicy.address;
		contractAddresses.governorAlpha = governorAlpha.address;
		contractAddresses.timelock = timelock.address;
		contractAddresses.orchestrator = orchestrator.address;

		contractAddresses.debaseDaiPool = debaseDaiPool.address;
		contractAddresses.debaseDaiLpPool = debaseDaiLpPool.address;
		contractAddresses.degovUsdcPool = degovUsdcPool.address;
		contractAddresses.degovUsdcLpPool = degovUsdcLpPool.address;

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
