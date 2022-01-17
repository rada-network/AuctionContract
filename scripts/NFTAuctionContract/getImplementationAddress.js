const { upgrades, hardhatArguments } = require('hardhat');
const { addresses } = require('./proxyAddresses');

async function main() {

  const network = hardhatArguments.network;
  const proxyAddress = addresses[network];

  const address = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("Proxy address is:", proxyAddress);
  console.log("Implementation address is:", address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });