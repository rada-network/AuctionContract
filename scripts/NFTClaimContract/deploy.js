const hre = require('hardhat');
const { ethers, upgrades, hardhatArguments } = hre;
const { pe, fe, fu, pu } = require('../../utils');
const fs = require('fs');
const { updateDeployedAddress } = require('./proxyAddress')
const contractName = "NFTClaimContract";
const { addresses: nftManContractAddress } = require('../NFTManContract/proxyAddresses');

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hardhatArguments.network;

  console.log("Deploying contracts with the account:", deployer.address);
  const beforeDeploy = fe(await deployer.getBalance());

  const contractFactory = await ethers.getContractFactory(contractName);

  // const nftManContractAddress = "0x77f866b1E2528544C8CBfda8D58001dd1abcE70e";

  const contractDeploy = await upgrades.deployProxy(contractFactory, [nftManContractAddress[network]], { kind: 'uups' });

  await contractDeploy.deployed();
  const proxyAddress = contractDeploy.address;
  console.log('Contract deployed to:', proxyAddress);
  const implementedAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Implemented address: ", implementedAddress);

  // store to deployed.json
  updateDeployedAddress(contractName, {proxyAddress, implementedAddress});

  // verify
  /*
  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [
      50,
      "a string argument",
      {
        x: 10,
        y: 5,
      },
      "0xabcdef",
    ],
  });
  */
  await hre.run("verify:verify", {
    address: implementedAddress,
    constructorArguments: [
    ],
  });

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost deploy:", (beforeDeploy - afterDeploy));

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });