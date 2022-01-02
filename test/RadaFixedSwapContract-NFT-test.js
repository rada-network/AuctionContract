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

describe("NFT Contract", function () {

  let contractRadaFixedSwap;
  let contractNFT;
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

    [owner, approvalUser, adminUser, withdrawUser, buyerUser, buyerUser2, ...addrs] = await ethers.getSigners();

    const RadaNftContract = await ethers.getContractFactory("RadaNftContract");
    contractNFT = await RadaNftContract.deploy();

    const BUSDToken = await ethers.getContractFactory("BUSDToken");
    bUSDToken = await BUSDToken.deploy();
    // const bUsdContract = await ethers.getContractAt("BUSDToken",BUSDAddress);

    // Get the ContractFactory
    const RadaFixedSwapContract = await ethers.getContractFactory("RadaFixedSwapContract");
    contractRadaFixedSwap = await upgrades.deployProxy(RadaFixedSwapContract, [bUSDToken.address], {
      kind: 'uups'
    });

    /* NFT */
    // Set updateBaseURI
    await contractNFT.updateBaseURI(URL_BASE);

    // Set approval
    await contractNFT.addApprovalWhitelist(approvalUser.address);

    // Set minterFactory for NFT
    await contractNFT.setMintFactory(contractRadaFixedSwap.address);

    /* RadaFixedSwapContract */
    // Set minter
    await contractRadaFixedSwap.setAdmin(adminUser.address, true);

    quantity = 1;
    priceEach = pe("150");
    poolId = 10;
    addressItem = contractNFT.address;
    const maxBuyPerAddress = 10;
    const title = "NFT Fixed Swap";
    const isSaleToken = false;
    const requireWhitelist = false;
    const isPublic = true;
    const startId = 10001;
    const endId = 10100;
    const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
    const endTime = Math.floor(Date.now() / 1000) + 86400*7; // Now + 7 days
    // Add pool
    await contractRadaFixedSwap.addPool(poolId, title, pe("150"), addressItem, isSaleToken);
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, title, addressItem, isSaleToken, startId, endId,startTime, endTime, priceEach, requireWhitelist, maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);

  });

  it('Deploy v1 and should set right minterFactory address, right minter address', async function () {
    expect(await contractNFT.hasRole(MINTER_ROLE, contractRadaFixedSwap.address)).to.equal(true);
    expect(await contractRadaFixedSwap.admins(adminUser.address)).to.equal(true);
  });

  it('Should the owner set withdraw address and can withdraw all funds', async function () {

    // Admin top up payable token to contract
    await bUSDToken.transfer(contractRadaFixedSwap.address, pe("2000"));
    const balanceFund = await bUSDToken.balanceOf(contractRadaFixedSwap.address);

    // Set withdraw address
    await contractRadaFixedSwap.setWithdrawAddress(withdrawUser.address);

    // Withdraw
    await contractRadaFixedSwap.withdrawFund(bUSDToken.address, pe("2000"));
    expect(await bUSDToken.balanceOf(withdrawUser.address)).to.equal(balanceFund.toString());

  });

  it('Should place order successfully - whitelist', async function () {
    // Set white list
    await contractRadaFixedSwap.setWhitelist(poolId, [buyerUser.address], true);

    // Set requireWhitelist
    const pool = await contractRadaFixedSwap.pools(poolId)
    const requireWhitelist = true;
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, pool.title, pool.addressItem, pool.isSaleToken, pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("50"));

    // Should reverted because smallest bid
    quantity = 1;
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Required valid quantity/price/balance");;

    // Should reverted because not enough BUSD
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Required valid quantity/price/balance");;

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("250"));

    // Place Order
    /* console.log(fe(await bUSDToken.balanceOf(buyerUser.address)));
    console.log(quantity); */
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    // console.log(await contractRadaFixedSwap.bids(poolId, 0));
    // console.log(fe(await bUSDToken.balanceOf(buyerUser.address)));
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("10001"));
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));
  });

  it('Should revert place order if not in white list - whitelist', async function () {

    // Set requireWhitelist
    const pool = await contractRadaFixedSwap.pools(poolId)
    const requireWhitelist = true;
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, pool.title, pool.addressItem, pool.isSaleToken, pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));
    // Not in white list should revert
    await bUSDToken.transfer(buyerUser2.address, pe("150"));
    await bUSDToken.connect(buyerUser2).approve(contractRadaFixedSwap.address, pe("150"));
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Caller is not in whitelist");

  });


  it('Should place order successfully with multi users - public', async function () {

    // Approve allowance
    const fundUser1 = 3000; // BUSD
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe((fundUser1).toString()));
    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe((fundUser1).toString()));


    // Place Order
    quantity = 5;
    priceEach = 150;
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity); // Order 1
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity); // Order 2
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Got limited");

    // User 1
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("10001"));
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe((fundUser1-priceEach*quantity*2).toString()));

    // Use 2
    const fundUser2 = 400; // BUSD
    quantity = 2;
    await bUSDToken.connect(buyerUser2).approve(contractRadaFixedSwap.address, pe((fundUser2).toString()));
    await bUSDToken.transfer(buyerUser2.address, pe((fundUser2).toString()));

    await contractRadaFixedSwap.connect(buyerUser2).placeOrder(poolId, quantity);
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser2.address, 0)).to.equal(pu("10011"));
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser2.address, 1)).to.equal(pu("10012"));
    // Check remain
    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("0"));

  });

  it('Should place order successfully and reverted over max buy allow - whitelist', async function () {
    // Set white list
    await contractRadaFixedSwap.setWhitelist(poolId, [buyerUser.address], true);
    // Set requireWhitelist
    const pool = await contractRadaFixedSwap.pools(poolId)
    const requireWhitelist = true;
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, pool.title, pool.addressItem, pool.isSaleToken, pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);
    // Set limit buy
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("3000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("3000"));
    // Place Order
    quantity = 9
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    // console.log(fu(await contractRadaFixedSwap.buyerItemsTotal(poolId, buyerUser.address)));
    quantity = 1
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    // console.log(fu(await contractRadaFixedSwap.buyerItemsTotal(poolId, buyerUser.address)));
    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Got limited");

    // Check bought
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("10001"));
  });


  it('Should place order successfully - public', async function () {
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));
    await bUSDToken.transfer(buyerUser.address, pe("300"));

    // Place Order with quantity 1
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

    // Check NFT
    expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("10001"));
  });


  it('Should reverted place order when pool has been not start or expired - whitelist', async function () {
    // Approve & top up BUSD
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("150"));
    await bUSDToken.transfer(buyerUser.address, pe("150"));

    // Set white list
    await contractRadaFixedSwap.setWhitelist(poolId, [buyerUser.address], true);
    const pool = await contractRadaFixedSwap.pools(poolId)
    const timeNotStart = Math.round(new Date().getTime()/1000) + 86400*2;
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, pool.title, pool.addressItem,pool.isSaleToken, pool.startId, pool.endId, timeNotStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);
    // Today plus 2 days

    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Not Started");

    const timeStart = Math.round(new Date().getTime()/1000) - 86400*2; // Today sub 2 days
    await contractRadaFixedSwap.handlePublicPool(poolId, false);
    await contractRadaFixedSwap.updatePool(poolId, pool.title, pool.addressItem,pool.isSaleToken, pool.startId, pool.endId, timeStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress);
    await contractRadaFixedSwap.handlePublicPool(poolId, true);

    // Now
    // Bought success
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    const START_TIME = Math.floor(Date.now() / 1000);
    const increaseDays = 600;
    const increaseTime = parseInt(START_TIME) - Math.floor(Date.now() / 1000) + 86400 * (increaseDays - 1);

    await ethers.provider.send("evm_increaseTime", [increaseTime]);
    await ethers.provider.send("evm_mine", []) // force mine the next block

    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Expired");;

  });

});