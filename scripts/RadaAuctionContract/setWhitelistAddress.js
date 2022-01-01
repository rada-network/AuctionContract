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
  const whitelist = [
    "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6", // Quang
    "0xA8f68bB8d525f5874df9202c63C1f02eeC3dFE1f", // Tan
  ];

  const poolId = fu(await RadaAuctionContract.campaignCount()) - 1;

  await RadaAuctionContract.setWhitelist(poolId, whitelist,true);

  console.log("setWhitelist success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });