const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: tokenAddresses } = require('../BoxTokenAddresses');
const { addresses: bUsdAddresses } = require('../BUSDAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];
  const tokenAddress = tokenAddresses[network];
  const bUsdAddress = bUsdAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RadaFixedSwapContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("RadaFixedSwapContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 18;
  const startPrice = pe("150");
  const addressItem = tokenAddress; // Address of NFT or Token
  const totalItems = 100;

  const startTime = 1640451600; // Sunday, December 26, 2021 12:00:00 AM GMT+07:00
  const endTime = 1672379856; // Friday, December 30, 2022 12:57:36 PM GMT+07:00
  const maxBuyPerAddress = 10;
  const maxBuyPerOrder = 2;
  const requireWhitelist = true;
  const whitelistIds = [0];

  await instanceContract.handlePublicPool(poolId, false);
  console.log("Pool changed status: false");
  await sleep(5000);
  await instanceContract.addOrUpdatePool(poolId, addressItem, bUsdAddress, totalItems, startTime, endTime, startPrice, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
  console.log("addOrUpdatePool "+poolId+" success");
  await instanceContract.setWhitelistIds(poolId, whitelistIds);

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