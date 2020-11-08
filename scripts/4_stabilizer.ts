import { run, ethers } from "hardhat";

import DebasePolicyArtifact from '../artifacts/contracts/flattened/DebasePolicy.sol/DebasePolicy.json';
import StabilizerPoolArtifact from '../artifacts/contracts/flattened/StabilizerPool.sol/StabilizerPool.json';

import { DebasePolicy } from '../type/DebasePolicy';
import { StabilizerPool } from '../type/StabilizerPool';

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
			parseEther('10000'),
			4 * 24 * 60 * 60
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
