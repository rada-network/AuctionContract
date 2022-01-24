const { updateDeployedAddress } = require('./../../utils/proxyAddress')
const contractName = "BoxToken";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractFactory = await ethers.getContractFactory(contractName);
  // Deploy 100k token
  const contractDeploy = await contractFactory.deploy();

  await contractDeploy.deployed();
  const txHash = contractDeploy.deployTransaction.hash;
  console.log(`Tx hash: ${txHash}\nWaiting for transaction to be mined...`);
  const txReceipt = await ethers.provider.waitForTransaction(txHash);
  const contractAddress = txReceipt.contractAddress
  console.log("Contract deployed to:", contractAddress);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });