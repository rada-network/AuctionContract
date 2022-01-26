require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('@nomiclabs/hardhat-ethers');

require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");
require('dotenv').config({ path: (process.argv.includes('polygon') || process.argv.includes('mainnet')) ? '.env.mainnet' : '.env' })
require('hardhat-contract-sizer');

// a new App in its dashboard, and replace "KEY" with its key
const RINKEBY_API_KEY = process.env.RINKEBY_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BSC_API_KEY = process.env.BSC_API_KEY;
const PLO_API_KEY = process.env.PLO_API_KEY;

// Replace this private key with your Ropsten account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MNEMONIC = process.env.MNEMONIC;


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.9",

  networks: {
    localhost: {
      url: "http://127.0.0.1:7545",
    },
    hardhat: {},
    testnet: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      // gas: 2100000,
      // gasPrice: 20000000000,
      accounts: [`0x${PRIVATE_KEY}`],
      /* accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      } */
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      // gas: 2100000,
      // gasPrice: 20000000000,
      accounts: [`0x${PRIVATE_KEY}`],
      /* accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20
      } */
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 137
    },
    polygonMumbai: {
      // url: "https://rpc-mumbai.maticvigil.com",
      url: "https://matic-mumbai.chainstacklabs.com",
      accounts: [`0x${PRIVATE_KEY}`],
      chainId: 80001,
      timeout: 60000,
    }
  },
  etherscan: {
    // apiKey: BSC_API_KEY
    apiKey: PLO_API_KEY
  },
  /* etherscan: {
    apiKey: {
      bsc: BSC_API_KEY,
      bscTestnet: BSC_API_KEY,
      polygon: PLO_API_KEY,
      polygonMumbai: PLO_API_KEY,
    }
  }, */
  gasReporter: {
    enabled: false,
    excludeContracts: ['RIRToken', 'MEOToken'],
    currency: 'USDT',
    gasPrice: 21,
    coinmarketcap: "8a859b7f-a9d8-40fe-8d22-5f1c8525ed69"
  },
  solidity: {
    version: "0.8.9",
    settings: {
        optimizer: {
            enabled: true,
            runs: 200,
        }
    }
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: ['RadaAuctionContract','RadaFixedSwapContract', 'NFTManContract', 'RandomizeByRarity', 'NFTClaimContract', 'NFTFixedSwapContract', 'NFTAuctionContract','WhitelistContract'],
  } 
};