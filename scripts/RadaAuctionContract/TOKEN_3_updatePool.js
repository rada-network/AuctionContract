const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];
  const tokenAddress = tokenAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RadaAuctionContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const RadaAuctionContract = await ethers.getContractAt("RadaAuctionContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 2; // 2
  const startPrice = pe("150");
  const addressItem = tokenAddress; // Address of NFT or Token
  const totalItems = 1000;

  const startTime = 1640451600; // Sunday, December 26, 2021 12:00:00 AM GMT+07:00
  const endTime = 1672379856; // Friday, December 30, 2022 12:57:36 PM GMT+07:00
  const maxBuyPerAddress = 10;
  const requireWhitelist = false;

  await RadaAuctionContract.handlePublicPool(poolId, false);
  console.log("Pool changed status: false");
  await sleep(5000);
  await RadaAuctionContract.updatePool(poolId, addressItem, totalItems, startTime, endTime, startPrice, requireWhitelist, maxBuyPerAddress);
  console.log("updatePool "+poolId+" success");
  await RadaAuctionContract.handlePublicPool(poolId, true);
  console.log("Pool changed status: true");
  await sleep(5000);
  const pool = await RadaAuctionContract.pools(poolId);
  console.log("Pool status: "+pool.isPublic);

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });