const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With WhitelistContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("WhitelistContract",contractAddress);

  const title = "Raders";
  const whitelist = [
    "0xAE51701F3eB7b897eB6EE5ecdf35c4fEE29BFAe6", // Quang
    "0xA8f68bB8d525f5874df9202c63C1f02eeC3dFE1f", // Tan
  ];
  await instanceContract.addList(title, whitelist);
  await sleep(5000);

  const listId = (await instanceContract.listIds.length) - 1;
  console.log("addList "+listId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });