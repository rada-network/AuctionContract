const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: fixedSwapAddresses } = require('../NFTFixedSwapContract/proxyAddresses');
const { erc20Abi, erc721Abi } = require('./abi');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const fixedSwapAddress = fixedSwapAddresses[network];

  console.log("With the account:", deployer.address);

  // TODO: Change your poolId
  const poolId = 22;
  const fixedSwapContract = await ethers.getContractAt("NFTFixedSwapContract", fixedSwapAddress);

  console.log('\x1b[31m','Pool Id',poolId);
  console.log('\x1b[36m%s\x1b[0m', '===========================');

  console.log('\x1b[33m%s\x1b[0m', 'NFTFixedSwapContract');
  var pool = await fixedSwapContract.pools(poolId);
  for (const [key, value] of Object.entries(pool)) {
    if (isNaN(key)) {
      if (key=='addressItem') {
        console.log(`${key}: ${value}`);
        if (value==ethers.constants.AddressZero) {
          console.log('\x1b[36m%s\x1b[0m', 'WARNING EMPTY addressItem');
        } else {
          const tokenContract = await ethers.getContractAt(erc20Abi, value);
          const nameToken = await tokenContract.name();
          console.log('\x1b[36m%s\x1b[0m', 'Token name:',nameToken);
        }
      } else if (key=='startPrice') {
        console.log('startPrice',fe(value),'$');
      } else {
        console.log(`${key}: ${value}`);
      }

    }
  }
  var tokenIds = await fixedSwapContract.getSaleTokenIds(poolId);
  console.log(`tokenIds: ${tokenIds}`);
  var whitelistIds = await fixedSwapContract.getWhitelistIds(poolId);
  console.log(`whitelistIds: ${whitelistIds}`);


  console.log('\x1b[36m%s\x1b[0m', '===========================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });