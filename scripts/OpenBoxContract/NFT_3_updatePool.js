const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With OpenBoxContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const OpenBoxContract = await ethers.getContractAt("OpenBoxContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 3; // 1 is auction, 3 is fixed swap
  const title = "NFT Box - Fixed Swap";
  const nftAddress = nftAddresses[network];

  var startId = 20101;
  var endId = 21000;
  var isSaleToken = false;
  const tokenAddress = ethers.constants.AddressZero;
  const nftBoxAddress = nftAddresses[network];

  await OpenBoxContract.updatePool(poolId, title, nftAddress, startId, endId, isSaleToken, tokenAddress, nftBoxAddress);
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