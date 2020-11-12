import { run, ethers } from 'hardhat';

import DegovArtifact from '../artifacts/contracts/flattened/Degov.sol/Degov.json';
import GovernorAlphaArtifact from '../artifacts/contracts/flattened/GovernorAlpha.sol/GovernorAlpha.json';
import TimelockArtifact from '../artifacts/contracts/flattened/Timelock.sol/Timelock.json';
import DebasePolicyArtifact from '../artifacts/contracts/flattened/DebasePolicy.sol/DebasePolicy.json';
import OrchestratorArtifact from '../artifacts/contracts/flattened/Orchrestrator.sol/Orchestrator.json';
import StabilizerPoolArtifact from '../artifacts/contracts/flattened/StabilizerPool.sol/StabilizerPool.json';
import moduleName from '../artifacts/contracts/flattened/Oracle.sol/Oracle.json';

import { Degov } from '../type/Degov';
import { GovernorAlpha } from '../type/GovernorAlpha';
import { StabilizerPool } from '../type/StabilizerPool';
import { Timelock } from '../type/Timelock';
import { DebasePolicy } from '../type/DebasePolicy';
import { Orchestrator } from '../type/Orchestrator';
import { Oracle } from '../type/Oracle';
import { promises } from 'fs';

async function main() {
	const signer = await ethers.getSigners();

	try {
		let data = await promises.readFile('contracts.json', 'utf-8');
		let dataParse = JSON.parse(data.toString());

		const degov = ((await ethers.getContractAt(DegovArtifact.abi, dataParse['degov'], signer[0])) as any) as Degov;
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

		const stabilizerPool = ((await ethers.getContractAt(
			StabilizerPoolArtifact.abi,
			dataParse['stabilizerPool'],
			signer[0]
		)) as any) as StabilizerPool;

		const oracle = ((await ethers.getContractAt(
			OrchestratorArtifact.abi,
			dataParse['oracle'],
			signer[0]
		)) as any) as Oracle;

		await timelock.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await degov.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await governorAlpha.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await debasePolicy.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await orchestrator.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await stabilizerPool.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
		await oracle.transferOwnership('0xf038C1cfaDAce2C0E5963Ab5C0794B9575e1D2c2');
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
