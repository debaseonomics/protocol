import { run, ethers } from '@nomiclabs/buidler';

import OrchestratorArtifact from '../artifacts/Orchestrator.json';
import { Orchestrator } from '../type/Orchestrator';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import { DebasePolicy } from '../type/DebasePolicy';

import { promises } from 'fs';

async function main() {
	const signer = await ethers.getSigners();
	try {
		let data = await promises.readFile('contracts.json', 'utf-8');
		let dataParse = JSON.parse(data.toString());

		const debasePolicy = ((await ethers.getContractAt(
			DebasePolicyArtifact.abi,
			dataParse['debasePolicy'],
			signer[0]
		)) as any) as DebasePolicy;

		let transaction = await debasePolicy.setUseDefaultRebaseLag(false);
		await transaction.wait(1);

		transaction = await debasePolicy.addNewLagBreakpoint(false, 0, 9000, 20);
		await transaction.wait(1);
		transaction = await debasePolicy.addNewLagBreakpoint(false, 9000, 15000, 10);
		await transaction.wait(1);

		transaction = await debasePolicy.addNewLagBreakpoint(true, 0, 9000, 20);
		transaction.wait(1);

		transaction = await debasePolicy.addNewLagBreakpoint(true, 9000, 15500, 8);
		transaction.wait(1);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
