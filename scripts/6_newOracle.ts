
import { run, ethers } from "hardhat";

import OracleV2Artifact from '../artifacts/contracts/OracleV2.sol/OracleV2.json';

import { OracleV2Factory } from '../type/OracleV2Factory';
import { promises } from 'fs';

async function main() {
	const signer = await ethers.getSigners();

	try {
		let data = await promises.readFile('contracts.json', 'utf-8');
		let dataParse = JSON.parse(data.toString());

		const oracleV2Factory = (new ethers.ContractFactory(
			OracleV2Artifact.abi,
			OracleV2Artifact.bytecode,
			signer[0]
		) as any) as OracleV2Factory;


		const oracleV2 = await oracleV2Factory.deploy(dataParse['debase'], dataParse['dai'], dataParse['debasePolicy']);
		console.log(oracleV2.address)

	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
