const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTManContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const NFTManContract = await ethers.getContractAt("NFTManContract",contractAddress);

  const admins = [
    "0x9d48959C8A287e5EdF3289861B29b60FD14D18f9", // Backend
    "0x5e78a9E858821EDd91b037d2f84C89A33C0FC38C", // Accounting
    "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6", // Quang
    "0xA8f68bB8d525f5874df9202c63C1f02eeC3dFE1f", // Tân
    // "0x0c1954CEB2227e3C5E6155B40fd929C1fF64F5f5", // Hieu
    "0xE8AE51B507CeB672712E99588a8b3Aa991A05420", // Lữ
  ];

  for (var i=0;i<admins.length;i++) {
    console.log("setAdmin " + admins[i]);
    try {
      await NFTManContract.setAdmin(admins[i]);
    } catch (e) {}
  }

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });