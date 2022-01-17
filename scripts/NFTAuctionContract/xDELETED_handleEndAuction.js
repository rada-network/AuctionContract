const { ethers, upgrades, hardhatArguments } = require('hardhat');
const { addresses: contractAddresses } = require('./proxyAddresses');
const { pe,fe,fu,pu } = require('../../utils');

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = hardhatArguments.network;
  const contractAddress = contractAddresses[network];

  console.log("With the account:", deployer.address);
  console.log("With NFTAuctionContract address:", contractAddress);
  const beforeDeploy = fe(await deployer.getBalance());

  const NFTAuctionContract = await ethers.getContractAt("NFTAuctionContract",contractAddress);

  // TODO: Fill your poolId
  const poolId = 10;

  // Get total bids
  const totalBid = fe(await NFTAuctionContract.totalBid(poolId));
  // Get All Bids of campaign
  console.log("Total Bid: "+totalBid);

  // Todo Import Winners
  const bidsIndex = [0];
  const quantityWin = [1];
  await NFTAuctionContract.handleEndAuction(poolId, bidsIndex, quantityWin);

  console.log("handleEndAuction "+poolId+" success");

  const afterDeploy = fe(await deployer.getBalance());
  console.log("Cost spent:", (beforeDeploy-afterDeploy));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });