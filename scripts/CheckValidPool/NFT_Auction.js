const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: auctionAddresses } = require('../NFTAuctionContract/proxyAddresses');
const { erc20Abi, erc721Abi } = require('./abi');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const auctionAddress = auctionAddresses[network];

  console.log("With the account:", deployer.address);

  // TODO: Change your poolId
  const poolId = 10;
  const auctionContract = await ethers.getContractAt("NFTAuctionContract", auctionAddress);

  console.log('\x1b[31m','Pool Id',poolId);
  console.log('\x1b[36m%s\x1b[0m', '===========================');

  console.log('\x1b[33m%s\x1b[0m', 'NFTAuctionContract');
  var pool = await auctionContract.pools(poolId);
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
  console.log('\x1b[36m%s\x1b[0m', '===========================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });