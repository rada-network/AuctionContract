const { upgrades, hardhatArguments } = require('hardhat');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

async function main() {

  const network = hardhatArguments.network;
  const contractAddress = tokenAddresses[network];

  console.log("Contract address is:", contractAddress);
  const name = "New Year Ticket";
  const symbol = "Card1";
  const initialSupply = 1000;
  const decimals = 0;

  await hre.run("verify:verify", {
    address: contractAddress,
    constructorArguments: [name, symbol, initialSupply, decimals],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });