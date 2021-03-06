const { updateDeployedAddress } = require('./../../utils/proxyAddress')
const contractName = "BoxToken";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractFactory = await ethers.getContractFactory(contractName);
  // Deploy 100k token

  const name = "New Year Ticket";
  const symbol = "Card1";
  const initialSupply = 1000;
  const decimals = 0;

  const contractDeploy = await contractFactory.deploy(name, symbol, initialSupply, decimals);

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