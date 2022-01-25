const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: nftManAddresses } = require('./../NFTManContract/proxyAddresses');
const { addresses: fixedSwapAddresses } = require('./../RadaFixedSwapContract/proxyAddresses');
const { addresses: randomizeAddresses } = require('./../RandomizeByRarity/proxyAddresses');

const { erc20Abi, erc721Abi } = require('./abi');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const fixedSwapAddress = fixedSwapAddresses[network];
  const nftManAddress = nftManAddresses[network];
  const randomizeAddress = randomizeAddresses[network];

  console.log("With the account:", deployer.address);

  // TODO: Change your poolId
  const poolId = 1;
  const fixedSwapContract = await ethers.getContractAt("RadaFixedSwapContract", fixedSwapAddress);
  const nftManContract = await ethers.getContractAt("NFTManContract", nftManAddress);
  const randomizeContract = await ethers.getContractAt("RandomizeByRarity", randomizeAddress);

  console.log('\x1b[31m','Pool Id',poolId);
  console.log('\x1b[36m%s\x1b[0m', '===========================');


  console.log('\x1b[33m%s\x1b[0m', 'RadaFixedSwapContract');
  var pool = await fixedSwapContract.pools(poolId);
  for (const [key, value] of Object.entries(pool)) {
    if (isNaN(key)) {
      if (key=='addressItem') {
        console.log(`${key}: ${value}`);
        const tokenContract = await ethers.getContractAt(erc20Abi, value);
        const nameToken = await tokenContract.name();

        const balanceContract = await tokenContract.balanceOf(fixedSwapContract.address);
        console.log('\x1b[36m%s\x1b[0m', 'Token name:',nameToken);
        console.log('\x1b[36m%s\x1b[0m', 'BalanceOf contract:',fu(balanceContract, fu(await tokenContract.decimals())));
      } else if (key=='startPrice') {
        console.log('startPrice',fe(value),'$');
      } else {
        console.log(`${key}: ${value}`);
      }

    }
  }
  console.log('\x1b[36m%s\x1b[0m', '===========================');

  console.log('\x1b[33m%s\x1b[0m', 'NFTManContract');
  var pool = await nftManContract.pools(poolId);
  for (const [key, value] of Object.entries(pool)) {
    if (isNaN(key)) {
      if (key=='nftAddress') {
        console.log(`${key}: ${value}`);
        const nftContract = await ethers.getContractAt(erc721Abi, value);
        const nameNFT = await nftContract.name();
        console.log('\x1b[36m%s\x1b[0m', 'NFT name:',nameNFT);
        // const supportErc721 = await nftContract.supportsInterface(0x80ac58cd);
        // console.log('\x1b[36m%s\x1b[0m', 'Support ERC721:',supportErc721);
      } else {
        console.log(`${key}: ${value}`);
      }

    }
  }
  console.log('\x1b[36m%s\x1b[0m', '===========================');



  console.log('\x1b[33m%s\x1b[0m', 'RandomizeByRarity');
  var pool = await randomizeContract.pools(poolId);
  for (const [key, value] of Object.entries(pool)) {
    if (isNaN(key)) {
      console.log(`${key}: ${value}`);
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