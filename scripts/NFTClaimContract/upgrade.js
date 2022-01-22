const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { getDeployedAddress } = require('./proxyAddress')
const contractName = "NFTClaimContract";

async function main() {
  const [deployer] = await ethers.getSigners();

  const proxyAddress = getDeployedAddress(contractName);
  if (!proxyAddress) return;

  console.log("Deploying contracts with the account:", deployer.address);

  const contract = await ethers.getContractFactory(contractName);

  console.log('Upgrading contract...: ', proxyAddress);
  await upgrades.upgradeProxy(proxyAddress, contract);
  console.log('Contract upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });