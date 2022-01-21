const { ethers, hardhatArguments } = require('hardhat');
const { linkTokens, vrfCoordinators, keyHashes, fees } = require('../RandomizeAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const linkToken = linkTokens[network];
  const vrfCoordinator = vrfCoordinators[network];
  const keyHash = keyHashes[network];
  const fee = fees[network];


  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const RandomizeByRarity = await ethers.getContractFactory("RandomizeByRarity");

  const contractDeploy = await RandomizeByRarity.deploy(linkToken, vrfCoordinator, keyHash, pe(fee));

  await contractDeploy.deployed();
  const txHash = contractDeploy.deployTransaction.hash;
  console.log(`Tx hash: ${txHash}\nWaiting for transaction to be mined...`);
  const txReceipt = await ethers.provider.waitForTransaction(txHash);
  console.log("Contract address:", txReceipt.contractAddress);

  // console.log("RandomizeByRarity address: find at website");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });