const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { pe,fe,fu,pu } = require('../../utils');
const { getDeployedAddress } = require('./proxyAddress')
const contractName = "NFTClaimContract";

async function main() {
  const [deployer] = await ethers.getSigners();

  const contractAddress = getDeployedAddress(contractName);
  const implementedAddress = await upgrades.erc1967.getImplementationAddress(contractAddress);

  console.log("With the account:", deployer.address);
  console.log("With NFTManContract address:", implementedAddress);
  
  await hre.run("verify:verify", {
    address: implementedAddress,
    constructorArguments: [
    ],
  });

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });