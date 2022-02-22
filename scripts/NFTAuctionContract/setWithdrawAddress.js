const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTAuctionContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("NFTAuctionContract",contractAddress);

  // TODO: add real whitelist
  const WITHDRAW_ADDRESS = "0x16DA4c7B28dc30BCE9e2B384E17a7b0078Fb97AE";
  await instanceContract.setWithdrawAddress(WITHDRAW_ADDRESS);

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