const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTFixedSwapContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("NFTFixedSwapContract",contractAddress);

  // TODO: add real whitelist
  const WITHDRAW_ADDRESS = "0x16DA4c7B28dc30BCE9e2B384E17a7b0078Fb97AE";
  await instanceContract.setWithdrawAddress(WITHDRAW_ADDRESS);

  console.log("setWithdrawAddress success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });