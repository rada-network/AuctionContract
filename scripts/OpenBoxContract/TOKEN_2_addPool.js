const { ethers, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftAddresses');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

const { pe,fe,fu,pu } = require('../../utils');

async function main() {

  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With OpenBoxContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const OpenBoxContract = await ethers.getContractAt("OpenBoxContract",contractAddress);

  // Create first campaign
  // TODO: Fill your poolId
  const poolId = 5; // 1 is auction, 3 is fixed swap, 5 Auction Token Box
  const title = "Token Box - Auction";
  const nftAddress = nftAddresses[network];
  var isSaleToken = true;
  const tokenAddress = tokenAddresses[network];

  await OpenBoxContract.addPool(poolId, title, nftAddress, isSaleToken, tokenAddress);


  console.log("addPool # "+poolId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });