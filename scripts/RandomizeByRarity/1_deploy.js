const { ethers, hardhatArguments } = require('hardhat');
const { linkTokens, vrfCoordinators, keyHashes, fees } = require('../RandomizeAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractName = "RandomizeByRarity";

  const network = hardhatArguments.network;
  const linkToken = linkTokens[network];
  const vrfCoordinator = vrfCoordinators[network];
  const keyHash = keyHashes[network];
  const fee = fees[network];


  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const RandomizeByRarity = await ethers.getContractFactory(contractName);

  const contractDeploy = await RandomizeByRarity.deploy(linkToken, vrfCoordinator, keyHash, pe(fee));

  await contractDeploy.deployed();
  const txHash = contractDeploy.deployTransaction.hash;
  console.log(`Tx hash: ${txHash}\nWaiting for transaction to be mined...`);
  const txReceipt = await ethers.provider.waitForTransaction(txHash);
  console.log(contractName, "Contract deployed to:", txReceipt.contractAddress);

  const implementedAddress = await upgrades.erc1967.getImplementationAddress(txReceipt.contractAddress);
  await hre.run("verify:verify", {
    address: implementedAddress,
    constructorArguments: [linkToken, vrfCoordinator, keyHash, pe(fee)],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });