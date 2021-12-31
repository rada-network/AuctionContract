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

  let contractRadaFixedSwap;
  let contractERC20;
  let addressItem;
  let bUSDToken;
  let poolId;
  let quantity;
  let priceEach;

  // Utils
  const pe = (num) => ethers.utils.parseEther(num) // parseEther
  const fe = (num) => ethers.utils.formatEther(num) // formatEther
  const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
  const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

  beforeEach(async function () {

    [owner, approvalUser, adminUser, withdrawUser, buyerUser, buyerUser2, ...addrs] = await ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BUSDToken");
    bUSDToken = await BUSDToken.deploy();

    const ERC20Token = await ethers.getContractFactory("BUSDToken");
    contractERC20 = await ERC20Token.deploy();

    // Get the ContractFactory
    const RadaFixedSwapContract = await ethers.getContractFactory("RadaFixedSwapContract");
    contractRadaFixedSwap = await upgrades.deployProxy(RadaFixedSwapContract, [bUSDToken.address], {
      kind: 'uups'
    });

    /* RadaFixedSwapContract */
    // Set minter
    await contractRadaFixedSwap.setAdmin(adminUser.address, true);

    // Add ERC20 token to Contract
    await contractERC20.transfer(contractRadaFixedSwap.address, pu("2000"));

    quantity = 1;
    priceEach = pe("150");
    poolId = 10;
    addressItem = contractERC20.address;
    const maxBuyPerAddress = 10;
    const isSaleToken = true; // Sale Token
    const requireWhitelist = true;
    const locked = false;
    const startId = 1; // Always start with 1
    const endId = 1000;
    const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
    const endTime = Math.floor(Date.now() / 1000) + 86400*7; // Now + 7 days
    // Add pool
    await contractRadaFixedSwap.addPool(poolId, pe("150"), addressItem, isSaleToken);

    await contractRadaFixedSwap.updatePool(poolId, addressItem, isSaleToken, startId, endId, startTime, endTime, priceEach, requireWhitelist);
    await contractRadaFixedSwap.handleMaxBuy(poolId, maxBuyPerAddress);
  });

  it('Deploy v1 and should set admin address', async function () {
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

    // Set maxBuyBoxPerAddress
    // const pool = await contractRadaFixedSwap.pools(poolId)

    const maxBuyPerAddress = 2;
    await contractRadaFixedSwap.handleMaxBuy(poolId, maxBuyPerAddress);
    // await contractRadaFixedSwap.updatePool(poolId, pool.addressItem,pool.isSaleToken,pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, pool.requireWhitelist);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("50"));

    // Should reverted because smallest bid
    quantity = 1;
    priceEach = pe("100");
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.reverted;

    // Should reverted because not enough BUSD
    priceEach = pe("150");
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.reverted;

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("250"));

    // Place Order
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

  });

  it('Should revert place order if not in white list - whitelist', async function () {

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));
    // Not in white list should revert
    await bUSDToken.transfer(buyerUser2.address, pe("150"));
    await bUSDToken.connect(buyerUser2).approve(contractRadaFixedSwap.address, pe("150"));
    // await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.reverted;
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.revertedWith("Caller is not in whitelist");

  });


  it('Should place order successfully - public', async function () {
    // Set white list
    const pool = await contractRadaFixedSwap.pools(poolId)
    // Allow 10 item
    const requireWhitelist = false;
    await contractRadaFixedSwap.updatePool(poolId, pool.addressItem,pool.isSaleToken,pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist);
    const maxBuyPerAddress = 10;
    await contractRadaFixedSwap.handleMaxBuy(poolId, maxBuyPerAddress);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("2000"));
    await bUSDToken.connect(buyerUser2).approve(contractRadaFixedSwap.address, pe("400"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("2000"));
    await bUSDToken.transfer(buyerUser2.address, pe("400"));


    // Place Order
    quantity = 5;
    priceEach = pe("150");
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach); // Order 0
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach); // Order 1
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.revertedWith("Got limited");
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("500"));
    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu((quantity*2).toString()));

    priceEach = pe("200");
    quantity = 2;
    await contractRadaFixedSwap.connect(buyerUser2).placeOrder(poolId, quantity, priceEach); // Order 2
    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("0"));
    expect(await contractERC20.balanceOf(buyerUser2.address)).to.equal(pu(quantity.toString()));

    /* console.log(await contractRadaFixedSwap.bids(poolId, 0));
    console.log(await contractRadaFixedSwap.bids(poolId, 1));
    console.log(await contractRadaFixedSwap.bids(poolId, 2)); */

  });

  it('Should place order successfully and reverted over max buy allow - whitelist', async function () {
    // Set white list
    await contractRadaFixedSwap.setWhitelist(poolId, [buyerUser.address], true);

    // Set limit buy
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("3000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("3000"));
    // Place Order
    quantity = 10;
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach);

    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.revertedWith("Got limited");

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu(quantity.toString()));
  });


  it('Should place order successfully & Claimed - public', async function () {
    // Set white list
    const pool = await contractRadaFixedSwap.pools(poolId)
    const requireWhitelist = false;
    await contractRadaFixedSwap.updatePool(poolId, pool.addressItem,pool.isSaleToken,pool.startId, pool.endId, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist);


    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("300"));

    // Place Order with Flat price
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu("1"));
  });


  it('Should reverted place order when pool has been not start or expired - whitelist', async function () {
    // Approve & top up BUSD
    await bUSDToken.connect(buyerUser).approve(contractRadaFixedSwap.address, pe("150"));
    await bUSDToken.transfer(buyerUser.address, pe("150"));

    // Set white list
    await contractRadaFixedSwap.setWhitelist(poolId, [buyerUser.address], true);
    const pool = await contractRadaFixedSwap.pools(poolId)
    const timeNotStart = Math.round(new Date().getTime()/1000) + 86400*2; // Today plus 2 days
    await contractRadaFixedSwap.updatePool(poolId, pool.addressItem,pool.isSaleToken,pool.startId, pool.endId, timeNotStart, pool.endTime, pool.startPrice, pool.requireWhitelist);

    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.revertedWith("Not Started");

    const timeStart = Math.round(new Date().getTime()/1000) - 86400*2; // Today plus 2 days
    await contractRadaFixedSwap.updatePool(poolId, pool.addressItem,pool.isSaleToken,pool.startId, pool.endId, timeStart, pool.endTime, pool.startPrice, pool.requireWhitelist);
    // Now
    // Bought success
    await contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach);

    const START_TIME = Math.floor(Date.now() / 1000);
    const increaseDays = 600;
    const increaseTime = parseInt(START_TIME) - Math.floor(Date.now() / 1000) + 86400 * (increaseDays - 1);

    await ethers.provider.send("evm_increaseTime", [increaseTime]);
    await ethers.provider.send("evm_mine", []) // force mine the next block

    // Should reverted
    await expect(contractRadaFixedSwap.connect(buyerUser).placeOrder(poolId, quantity, priceEach)).to.be.revertedWith("Expired");;

  });

});