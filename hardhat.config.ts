import "dotenv/config";
import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-deploy-ethers";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "hardhat-typechain";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";

import { node_url, accounts } from "./utils/network";

const gasPrice = 151e9;

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.7.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999, 
          }
        }
      },
      { version: "0.5.5" },
    ],
  },
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      accounts: accounts(),
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: accounts(),
    },
    mainnet: {
      url: node_url("mainnet"),
      accounts: accounts("mainnet"),
      gasPrice: gasPrice,
    },
    rinkeby: {
      url: node_url("rinkeby"),
      accounts: accounts("rinkeby"),
    },
    ropsten: {
      url: node_url("ropsten"),
      accounts: accounts("ropsten"),
      gasPrice: gasPrice,
    }
  },
  paths: {
    sources: "./contracts",
  },
  gasReporter: {
    currency: "ETH",
    gasPrice: 101,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKET_API_KEY,
    maxMethodDiff: 10,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  }
};

export default config;
