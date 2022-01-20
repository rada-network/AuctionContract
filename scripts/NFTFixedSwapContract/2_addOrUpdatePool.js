const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: nftAddresses } = require('../RadaNftAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];
  const nftAddress = nftAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTFixedSwapContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("NFTFixedSwapContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 12;

  const startPrice = pe("1000");
  // const addressItem = nftAddress; // Address of NFT or Token
  const addressItem = "0xb06ba26ef6e7fe5d0213a0a90dd251923e97214c"; // HNFT Testnet

  const startTime = 1640451600; // Sunday, December 26, 2021 12:00:00 AM GMT+07:00
  const endTime = 1672379856; // Friday, December 30, 2022 12:57:36 PM GMT+07:00
  const maxBuyPerAddress = 10;
  const maxBuyPerOrder = 2;
  const requireWhitelist = false;

  await instanceContract.handlePublicPool(poolId, false);
  console.log("Pool changed status: false");
  await sleep(5000);
  await instanceContract.addOrUpdatePool(poolId, addressItem, startTime, endTime, startPrice, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
  console.log("addOrUpdatePool "+poolId+" success");
  await instanceContract.handlePublicPool(poolId, true);
  console.log("Pool changed status: true");
  await sleep(5000);
  const pool = await instanceContract.pools(poolId);
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