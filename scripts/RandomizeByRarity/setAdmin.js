const { ethers, upgrades, hardhatArguments } = require('hardhat');
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

  // TODO: add real admin
  const admins = [
    "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6", // Quang
    "0x0c1954CEB2227e3C5E6155B40fd929C1fF64F5f5", // HieuVector
  ];

  for (var i=0;i<admins.length;i++) {
    await RandomizeByRarity.setAdmin(admins[i]);
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