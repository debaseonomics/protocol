import { run, ethers } from '@nomiclabs/buidler';

import OracleArtifact from '../artifacts/Oracle.json';
import DebasePolicyArtifact from '../artifacts/DebasePolicy.json';

import { OracleFactory } from '../type/OracleFactory';
import { DebasePolicy } from '../type/DebasePolicy';
import { promises } from 'fs';

async function main() {
	const signer = await ethers.getSigners();

	try {
		let data = await promises.readFile('contracts.json', 'utf-8');
		let dataParse = JSON.parse(data.toString());

		const oracleFactory = (new ethers.ContractFactory(
			OracleArtifact.abi,
			OracleArtifact.bytecode,
			signer[0]
		) as any) as OracleFactory;
		const debasePolicy = ((await ethers.getContractAt(
			DebasePolicyArtifact.abi,
			dataParse['debasePolicy'],
			signer[0]
		)) as any) as DebasePolicy;

		const oracle = await oracleFactory.deploy(dataParse['debase'], dataParse['dai'], dataParse['debasePolicy']);
		await debasePolicy.setOracle(oracle.address);

		dataParse['oracle'] = oracle.address;
		const updatedData = JSON.stringify(dataParse);
		await promises.writeFile('contracts.json', updatedData);
	} catch (error) {
		console.log(error);
	}
}

main().then(() => process.exit(0)).catch((error) => {
	console.error(error);
	process.exit(1);
});
