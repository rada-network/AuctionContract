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

  console.log('upgrade done');
  // verify new contract
  const implementedAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  await hre.run("verify:verify", {
    address: implementedAddress,
    constructorArguments: [
    ],
  });

  console.log('Contract upgraded: ', implementedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });