const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: whitelistAddresses } = require('../WhitelistContract/proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hardhatArguments.network;

  console.log("Deploying contracts with the account:", deployer.address);
  const beforeDeploy = fe(await deployer.getBalance());

  const RadaFixedSwapContract = await ethers.getContractFactory("RadaFixedSwapContract");

  const contractDeploy = await upgrades.deployProxy(RadaFixedSwapContract, [], { kind: 'uups' });
  console.log("Contract address:", contractDeploy.address);

  console.log("Set Whitelist Address",whitelistAddresses[network]);
  await contractDeploy.setWhitelistAddress(whitelistAddresses[network]);

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost deploy:", (beforeDeploy-afterDeploy));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });