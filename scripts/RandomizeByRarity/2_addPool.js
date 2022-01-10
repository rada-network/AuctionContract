const { ethers, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');

const { pe,fe,fu,pu } = require('../../utils');

async function main() {

  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RandomizeByRarity address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const RandomizeByRarity = await ethers.getContractAt("RandomizeByRarity",contractAddress);

  // Create first campaign
  // TODO: Fill your poolId
  const poolId = 2; // 2 Auction Token

  const title = "Token Box - Auction";
  const rarity = [1000,10,10,3,3,3,2,2,2,1,1,1];

  await RandomizeByRarity.addPool(poolId, title, rarity);


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