const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');

const { pe,fe,fu,pu, sleep } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTFixedSwapContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const instanceContract = await ethers.getContractAt("NFTFixedSwapContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 12; // Defihorse Heroic
  const tokenIdStart = 4;
  const tokenIdEnd = 303;
  let saleTokenIds = [];
  for (let i=tokenIdStart;i<=tokenIdEnd;i++) {
    saleTokenIds.push(i);
  }

  await instanceContract.handlePublicPool(poolId, false);
  console.log("Pool changed status: false");
  await sleep(5000);
  await instanceContract.updateSalePool(poolId, saleTokenIds);
  console.log("updateSalePool. "+poolId+" success");
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