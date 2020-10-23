import { run, ethers } from '@nomiclabs/buidler';

import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';
import StabilizerPoolArtifact from '../artifacts/StabilizerPool.json';

import { DebasePolicy } from '../type/DebasePolicy';
import { StabilizerPool } from '../type/StabilizerPool';
import { StabilizerPoolFactory } from '../type/StabilizerPoolFactory';

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

		const stabilizerPool = ((await ethers.getContractAt(
			StabilizerPoolArtifact.abi,
			dataParse['stabilizerPool'],
			signer[0]
		)) as any) as StabilizerPool;

		let transaction = await stabilizerPool.initialize(
			'Rebase Sequence Pool',
			dataParse['debase'],
			dataParse['debaseDaiLp'],
			dataParse['debasePolicy'],
			parseEther('5000'),
			7 * 24 * 60 * 60
		);
		await transaction.wait(1);
		await debasePolicy.addNewStabilizerPool(stabilizerPool.address);

	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
