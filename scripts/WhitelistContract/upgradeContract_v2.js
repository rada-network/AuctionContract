const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses } = require('./proxyAddresses');

const contractName = "WhitelistContract";

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const proxyAddress = addresses[network];

  console.log("Deploying contracts with the account:", deployer.address);

  const contract = await ethers.getContractFactory(contractName);

  console.log('Upgrading contract...');
  await upgrades.upgradeProxy(proxyAddress, contract);
  console.log('Contract upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });