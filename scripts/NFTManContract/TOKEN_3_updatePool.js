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
  const poolId = 2; // 2 auction, 4 fixed
  var startId = 40101;
  var endId = 41000;
  const nftAddress = nftAddresses[network];
  const tokenAddress = tokenAddresses[network];

  await NFTManContract.updatePool(poolId, nftAddress, startId, endId, tokenAddress);
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