const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { addresses: auctionAddresses } = require('../RadaAuctionContract/proxyAddresses');
const { addresses: fixedSwapAddresses } = require('../RadaFixedSwapContract/proxyAddresses');
const { pe,fe,fu,pu } = require('../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];
  const auctionAddress = auctionAddresses[network];
  const fixedSwapAddress = fixedSwapAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With RadaNftContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const nftContract = await ethers.getContractAt("RadaNftContract",contractAddress);
  await nftContract.setMintFactory(auctionAddress);
  await nftContract.setMintFactory(fixedSwapAddress);

  console.log("setMintFactory changed");

  const URL_BASE = "https://nft.1alo.com/rada/v1/";
  await nftContract.updateBaseURI(URL_BASE);

  console.log("updateBaseURI changed");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost deploy:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });