import { run, ethers } from '@nomiclabs/buidler';

import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import StabilizerPoolArtifact from '../artifacts/StabilizerPool.json';

import { StabilizerPool } from '../type/StabilizerPool';
import { DebasePolicy } from '../type/DebasePolicy';

import { promises } from 'fs';
import { parseEther } from 'ethers/lib/utils';

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

		const debaseDaiLpStabilizerPool = ((await ethers.getContractAt(
			StabilizerPoolArtifact.abi,
			dataParse['debaseDaiLpStabilizerPool'],
			signer[0]
		)) as any) as StabilizerPool;

		//await debasePolicy.addNewStabilizerPool(debaseDaiLpStabilizerPool.address);
		await debasePolicy.toggleStabilizerPool(0);

		// await debasePolicy.setUseDefaultRebaseLag(false);
		// await debasePolicy.addNewLagBreakpoint(true, 0, parseEther('150000'), 23);
		// await debasePolicy.addNewLagBreakpoint(false, 0, parseEther('150000'), 12);
		// await debasePolicy.updateLagBreakpoint(true, 0, 0, parseEther('1000000'), 32);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
