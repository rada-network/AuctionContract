const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftAddresses');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTManContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const NFTManContract = await ethers.getContractAt("NFTManContract",contractAddress);

  // TODO: Fill your poolId
  /* const poolId = 15; // 15 auction, 16 fixed
  var startId = 1000;
  var endId = 1999; */
  const poolId = 16; // 15 auction, 16 fixed
  var startId = 2000;
  var endId = 2999;

  const startTime = 1640451600; // Sunday, December 26, 2021 12:00:00 AM GMT+07:00
  const nftAddress = nftAddresses[network];
  const tokenAddress = tokenAddresses[network];

  await NFTManContract.addOrUpdatePool(poolId, nftAddress, startId, endId, tokenAddress, startTime);
  console.log("updatePool "+poolId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });