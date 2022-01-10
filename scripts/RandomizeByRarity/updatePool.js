const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RandomizeByRarity address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const RandomizeByRarity = await ethers.getContractAt("RandomizeByRarity",contractAddress);

  // TODO: Fill your poolId
  const poolId = 2; // 2 Auction Token
  const title = "Token Box - Auction";
  const rarity = [];

  await RandomizeByRarity.updatePool(poolId, title, rarity);
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