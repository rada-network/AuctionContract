const { ethers, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftContract/proxyAddresses');

const { pe,fe,fu,pu } = require('../utils');

async function main() {

  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];
  const nftAddress = nftAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RadaFixedSwapContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const RadaFixedSwapContract = await ethers.getContractAt("RadaFixedSwapContract",contractAddress);

  // Create first campaign
  // TODO: Fill your poolId
  const poolId = 3;
  const startPrice = pe("150");
  const addressItem = nftAddress; // Address of NFT or Token
  const isSaleToken = false; // Sale NFT or Token
  await RadaFixedSwapContract.createPool(poolId, startPrice, addressItem, isSaleToken);

  console.log("createPool # "+poolId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });