const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const tokenAddress = tokenAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("Top up", tokenAddress);

  const tokenContract = await ethers.getContractAt("BoxToken",tokenAddress);

  // TODO: add list
  const topUpList = [
    "0x71d7e26bE11518495F268860Df643811133C5a5a"
  ];

  const tokenTopUp = pu("1000"); // 1000 box (decimals 0)

  for (const addr of topUpList) {
    await tokenContract.transfer(addr,tokenTopUp)
    console.log("Send Box Token to "+addr);
  }

  console.log("Top up success");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });