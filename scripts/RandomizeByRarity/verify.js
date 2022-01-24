const { upgrades, hardhatArguments } = require('hardhat');
const { addresses } = require('./proxyAddresses');
const { linkTokens, vrfCoordinators, keyHashes, fees } = require('../RandomizeAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {

  const network = hardhatArguments.network;
  const proxyAddress = addresses[network];

  console.log("Contract address is:", proxyAddress);

  const linkToken = linkTokens[network];
  const vrfCoordinator = vrfCoordinators[network];
  const keyHash = keyHashes[network];
  const fee = fees[network];

  await hre.run("verify:verify", {
    address: proxyAddress,
    constructorArguments: [linkToken, vrfCoordinator, keyHash, pe(fee)],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });