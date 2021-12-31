const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftAddresses');

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

  // TODO: Fill your poolId
  const poolId = 3;
  const title = "Token Fixed Swap";
  const startPrice = pe("150");
  const addressItem = nftAddress; // Address of NFT or Token
  const isSaleToken = false; // Sale NFT or Token
  var startId;
  var endId;
  if (isSaleToken) { // Sale Token, total 500 token
    startId = 0; // Alway start with 1
    endId = 0;
  } else { // Sale NFT, range of tokenId, total 1000 NFT
    startId = 10001;
    endId = 11000;
  }

  const startTime = 1640451600; // Sunday, December 26, 2021 12:00:00 AM GMT+07:00
  const endTime = 1672379856; // Friday, December 30, 2022 12:57:36 PM GMT+07:00
  const locked = false;
  const maxBuyPerAddress = 10;
  const requireWhitelist = false;

  await RadaFixedSwapContract.updatePool(poolId, title, addressItem, isSaleToken, startId, endId, startTime, endTime, locked, startPrice, maxBuyPerAddress, requireWhitelist);

  console.log("updatePool "+poolId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });