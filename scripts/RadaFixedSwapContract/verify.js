const { upgrades, hardhatArguments } = require('hardhat');
const { addresses } = require('./proxyAddresses');

async function main() {

  const network = hardhatArguments.network;
  const proxyAddress = addresses[network];

  const implementedAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Proxy address is:", proxyAddress);
  console.log("Implementation address is:", implementedAddress);

  await hre.run("verify:verify", {
    address: implementedAddress,
    constructorArguments: [],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });