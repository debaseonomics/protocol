import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-typechain';

const config: HardhatUserConfig = {
	solidity: {
		version: '0.6.6',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200
			}
		}
	},
	paths: {
		sources: './contracts/flattened'
	},
	etherscan: {
		apiKey: 'WSEBKEYQAFZ8AUGMFAKJR7GPCNYZ9Q3AIE'
	},
	typechain: {
		outDir: './type',
		target: 'ethers-v5'
	}
};

export default config;
