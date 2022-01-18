// We import Chai to use its asserting functions here.
const {
  expect
} = require("chai");
const {
  ethers,
  upgrades
} = require('hardhat');
const {
  BN,
  constants,
  expectEvent,
  expectRevert
} = require('@openzeppelin/test-helpers');

describe("Auction Contract - Token", function () {

  let contractAuction;
  let contractERC20;
  let addressItem;
  let bUSDToken;
  let poolId;
  let quantity;
  let priceEach;
  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
  const URL_BASE = "https://nft.1alo.com/v1/rada/";

  // Utils
  const pe = (num) => ethers.utils.parseEther(num) // parseEther
  const fe = (num) => ethers.utils.formatEther(num) // formatEther
  const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
  const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

  beforeEach(async function () {

    [owner, approvalUser, adminUser, withdrawUser, buyerUser, buyerUser2, buyerUser3, ...addrs] = await ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BUSDToken");
    bUSDToken = await BUSDToken.deploy();

    const ERC20Token = await ethers.getContractFactory("BoxToken");
    contractERC20 = await ERC20Token.deploy();

    // Get the ContractFactory
    const RadaAuctionContract = await ethers.getContractFactory("RadaAuctionContract");
    contractAuction = await upgrades.deployProxy(RadaAuctionContract, [bUSDToken.address], {
      kind: 'uups'
    });

    /* RadaAuctionContract */
    // Set minter
    await contractAuction.setAdmin(adminUser.address, true);

    // Add ERC20 token to Contract
    await contractERC20.transfer(contractAuction.address, pu("2000"));

    quantity = 1;
    priceEach = pe("150");
    poolId = 10;
    addressItem = contractERC20.address;
    const maxBuyPerAddress = 10;
    const requireWhitelist = true;
    const isPublic = true;
    const totalItems = 1000;
    const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
    const endTime = Math.floor(Date.now() / 1000) + 86400*7; // Now + 7 days
    // Add pool
    // await contractAuction.addPool(poolId, pe("150"), addressItem);
    await contractAuction.handlePublicPool(poolId, false);
    await contractAuction.addOrUpdatePool(poolId, addressItem, totalItems,startTime, endTime, priceEach, requireWhitelist, maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);
  });

  it('Deploy v1 and should set admin address', async function () {
    expect(await contractAuction.isAdmin(adminUser.address)).to.equal(true);
  });

  it('Should the owner set withdraw address and can withdraw all funds', async function () {

    // Admin top up payable token to contract
    await bUSDToken.transfer(contractAuction.address, pe("2000"));
    const balanceFund = await bUSDToken.balanceOf(contractAuction.address);

    // Set withdraw address
    await contractAuction.setWithdrawAddress(withdrawUser.address);

    // Withdraw
    await contractAuction.withdrawFund(bUSDToken.address, pe("2000"));
    expect(await bUSDToken.balanceOf(withdrawUser.address)).to.equal(balanceFund.toString());

  });

  it('Should place Bid successfully - whitelist', async function () {
    // Set white list
    await contractAuction.setWhitelist(poolId, [buyerUser.address], true);

    // Set maxBuyBoxPerAddress
    const pool = await contractAuction.pools(poolId)
    const maxBuyPerAddress = 2;
    await contractAuction.handlePublicPool(poolId, false);
    await contractAuction.addOrUpdatePool(poolId, pool.addressItem,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, pool.requireWhitelist, maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("50"));

    // Should reverted because smallest bid
    quantity = 1;
    priceEach = pe("100");
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Required valid quantity/price/balance");

    // Should reverted because not enough BUSD
    priceEach = pe("150");
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("250"));
    // Approve small allowance
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("100"));
    // Should reverted because smallest approval
    quantity = 1;
    priceEach = pe("200");
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("ERC20: transfer amount exceeds allowance");

    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("300"));

    // Place Bid
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("100"));

  });

  it('Should revert place Bid if not in white list - whitelist', async function () {

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("300"));
    // Not in white list should revert
    await bUSDToken.transfer(buyerUser2.address, pe("150"));
    await bUSDToken.connect(buyerUser2).approve(contractAuction.address, pe("150"));
    // await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.reverted;
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Caller is not in whitelist");

  });


  it('Should place Bid successfully - public', async function () {
    // Set white list
    const pool = await contractAuction.pools(poolId)
    // Allow 10 item
    const requireWhitelist = false;
    await contractAuction.handlePublicPool(poolId, false);
    const maxBuyPerAddress = 10;
    await contractAuction.addOrUpdatePool(poolId, pool.addressItem,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("2000"));
    await bUSDToken.connect(buyerUser2).approve(contractAuction.address, pe("400"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("2000"));
    await bUSDToken.transfer(buyerUser2.address, pe("400"));


    // Place Bid
    quantity = 5;
    priceEach = pe("150");
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach); // Bid 0
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach); // Bid 1
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Got limited");
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("500"));

    priceEach = pe("200");
    quantity = 2;
    await contractAuction.connect(buyerUser2).placeBid(poolId, quantity, priceEach); // Bid 2

    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("0"));

    // Handle end auction and Claimed
    await expect(contractAuction.connect(buyerUser).handleEndAuction(poolId, [0,1,2], [1,0,2])).to.be.revertedWith("Caller is not an admin");

    // Bid 0 only win 1 nft
    await contractAuction.connect(adminUser).handleEndAuction(poolId, [0,2], [1,2]);
    // Transfer money back to contract
    await bUSDToken.transfer(contractAuction.address, pe("2000"));

    /* console.log(await contractAuction.bids(poolId, 0));
    console.log(await contractAuction.bids(poolId, 1));
    console.log(await contractAuction.bids(poolId, 2)); */

    // Try claim illegal
    await expect(contractAuction.connect(buyerUser3).claimAll(poolId)).to.be.revertedWith("Invalid pool");

    // User 1 claim
    await contractAuction.connect(buyerUser).claimAll(poolId); // Claim bid
    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu("1"));
    // check Refund remain
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("1850"));

    // User 2 claim
    await contractAuction.connect(buyerUser2).claimAll(poolId); // Claim bid
    // Try claim again
    await contractAuction.connect(buyerUser2).claimAll(poolId); // Claim bid again but nothing

    expect(await contractERC20.balanceOf(buyerUser2.address)).to.equal(pu("2"));
    // Check remain
    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("0"));

  });

  it('Should place Bid successfully and reverted over max buy allow - whitelist', async function () {
    // Set white list
    await contractAuction.setWhitelist(poolId, [buyerUser.address], true);

    // Set limit buy
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("3000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("3000"));
    // Place Bid
    quantity = 5;
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach);
    quantity = 4;
    await expect(contractAuction.connect(buyerUser).increaseBid(poolId, 0, quantity, priceEach)).to.be.revertedWith("Bid not valid");
    quantity = 10;
    await contractAuction.connect(buyerUser).increaseBid(poolId, 0, quantity, priceEach);

    // Should reverted
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Got limited");

    // Handle end auction and Claimed
    await contractAuction.connect(adminUser).handleEndAuction(poolId, [0], [5]);
    // Transfer money back to contract
    await bUSDToken.transfer(contractAuction.address, pe("2000"));

    await contractAuction.connect(buyerUser).claimAll(poolId);

    // Try claim again
    await contractAuction.connect(buyerUser).claimAll(poolId);
    await contractAuction.connect(buyerUser).claimAll(poolId);

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu("5"));
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("2250"));

  });


  it('Should place Bid successfully & Claimed - public', async function () {
    // Set white list
    const pool = await contractAuction.pools(poolId)
    const requireWhitelist = false;
    await contractAuction.handlePublicPool(poolId, false);
    await contractAuction.addOrUpdatePool(poolId, pool.addressItem,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);


    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("450"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("450"));

    // Place Bid with Flat price
    quantity = 3;
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("0"));

    // Handle End Bid, just Win 2 box
    await contractAuction.connect(adminUser).handleEndAuction(poolId, [0], [2]);
    // Transfer money back to contract
    await bUSDToken.transfer(contractAuction.address, pe("2000"));

    // Claim Token of Bid 0
    await contractAuction.connect(buyerUser).claimAll(poolId);

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu("2"));
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

  });


  it('Should reverted place Bid when pool has been not start or expired - whitelist', async function () {
    // Approve & top up BUSD
    await bUSDToken.connect(buyerUser).approve(contractAuction.address, pe("150"));
    await bUSDToken.transfer(buyerUser.address, pe("150"));

    // Set white list
    await contractAuction.setWhitelist(poolId, [buyerUser.address], true);
    const pool = await contractAuction.pools(poolId)
    const timeNotStart = Math.round(new Date().getTime()/1000) + 86400*2; // Today plus 2 days
    await contractAuction.handlePublicPool(poolId, false);
    await contractAuction.addOrUpdatePool(poolId, pool.addressItem,pool.totalItems, timeNotStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);
    // Should reverted
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Not Started");

    const timeStart = Math.round(new Date().getTime()/1000) - 86400*2; // Today plus 2 days
    await contractAuction.handlePublicPool(poolId, false);
    await contractAuction.addOrUpdatePool(poolId, pool.addressItem,pool.totalItems, timeStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress);
    await contractAuction.handlePublicPool(poolId, true);
    // Now
    // Bought success
    await contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach);

    const START_TIME = Math.floor(Date.now() / 1000);
    const increaseDays = 600;
    const increaseTime = parseInt(START_TIME) - Math.floor(Date.now() / 1000) + 86400 * (increaseDays - 1);

    await ethers.provider.send("evm_increaseTime", [increaseTime]);
    await ethers.provider.send("evm_mine", []) // force mine the next block

    // Should reverted
    await expect(contractAuction.connect(buyerUser).placeBid(poolId, quantity, priceEach)).to.be.revertedWith("Expired");;

  });

});