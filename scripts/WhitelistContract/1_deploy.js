const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: busdAddresses } = require('../BUSDAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hardhatArguments.network;

  console.log("Deploying contracts with the account:", deployer.address);
  const beforeDeploy = fe(await deployer.getBalance());

  const WhitelistContract = await ethers.getContractFactory("WhitelistContract");

  const contractDeploy = await upgrades.deployProxy(WhitelistContract, [], { kind: 'uups' });
  console.log("Contract address:", contractDeploy.address);

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost deploy:", (beforeDeploy-afterDeploy));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });