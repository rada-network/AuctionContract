const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { pe,fe,fu,pu } = require('../../utils');
const { getDeployedAddress } = require('./proxyAddress')
const contractName = "NFTClaimContract";

async function main() {
  const [deployer] = await ethers.getSigners();

  const contractAddress = getDeployedAddress(contractName);

  console.log("With the account:", deployer.address);
  console.log("With NFTManContract address:", contractAddress);
  
  const NFTManContract = await ethers.getContractAt(contractName, contractAddress);

  // TODO: add real whitelist
  const admins = [
    // "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6",
    "0xA8f68bB8d525f5874df9202c63C1f02eeC3dFE1f",
    "0x0c1954CEB2227e3C5E6155B40fd929C1fF64F5f5",
  ];

  for (var i=0;i<admins.length;i++) {
    console.log("setAdmin " + admins[i]);
    await NFTManContract.setAdmin(admins[i]);
  }

  console.log("Done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });