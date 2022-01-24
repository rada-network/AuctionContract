const { upgrades, hardhatArguments } = require('hardhat');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

async function main() {

  const network = hardhatArguments.network;
  const contractAddress = tokenAddresses[network];

  console.log("Contract address is:", contractAddress);

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });