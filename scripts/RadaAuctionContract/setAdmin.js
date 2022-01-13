const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RadaAuctionContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const RadaAuctionContract = await ethers.getContractAt("RadaAuctionContract",contractAddress);

  // TODO: add real whitelist
  const admins = [
    "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6", // Quang
    "0xA8f68bB8d525f5874df9202c63C1f02eeC3dFE1f", // Tan
    "0x0c1954CEB2227e3C5E6155B40fd929C1fF64F5f5", // HieuVector
    "0xE8AE51B507CeB672712E99588a8b3Aa991A05420", // Lu
  ];

  for (var i=0;i<admins.length;i++) {
    await RadaAuctionContract.setAdmin(admins[i],true);
    console.log("setAdmin " + admins[i]);
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