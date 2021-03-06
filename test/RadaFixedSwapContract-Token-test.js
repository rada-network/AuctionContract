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

describe("Fixed Swap Contract - Token", function () {

  let contractFixedSwap;
  let contractWhitelist;
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

    [owner, approvalUser, adminUser, withdrawUser, buyerUser, buyerUser2, buyerUser3, invalidUser, ...addrs] = await ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BUSDToken");
    bUSDToken = await BUSDToken.deploy();

    const ERC20Token = await ethers.getContractFactory("BoxToken");
    contractERC20 = await ERC20Token.deploy();

    // Deploy Whitelist Contract first
    const WhitelistContract = await ethers.getContractFactory("WhitelistContract");
    contractWhitelist = await upgrades.deployProxy(WhitelistContract, [], { kind: 'uups' });

    // Get the ContractFactory
    const RadaFixedSwapContract = await ethers.getContractFactory("RadaFixedSwapContract");
    contractFixedSwap = await upgrades.deployProxy(RadaFixedSwapContract, [], {kind: 'uups'});

    /* RadaFixedSwapContract */
    // Set minter
    await contractFixedSwap.setAdmin(adminUser.address, true);
    await contractFixedSwap.setWhitelistAddress(contractWhitelist.address);

    /* WhitelistContract */
    var whitelist = [buyerUser.address,buyerUser2.address,buyerUser3.address];
    await contractWhitelist.addList("Raders", whitelist);

    // Add ERC20 token to Contract
    await contractERC20.transfer(contractFixedSwap.address, pu("2000"));

    quantity = 1;
    priceEach = pe("150");
    poolId = 10;
    addressItem = contractERC20.address;
    const maxBuyPerAddress = 10;
    const maxBuyPerOrder = 2;
    const requireWhitelist = true;
    const totalItems = 1000;
    const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
    const endTime = Math.floor(Date.now() / 1000) + 86400*7; // Now + 7 days
    const whitelistIds = [0];

    // Add pool
    // await contractFixedSwap.addPool(poolId, pe("150"), addressItem);
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, addressItem, bUSDToken.address, totalItems, startTime, endTime, priceEach, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
    await contractFixedSwap.setWhitelistIds(poolId, whitelistIds);
    await contractFixedSwap.handlePublicPool(poolId, true);
  });

  it('Deploy v1 and should set admin address', async function () {
    expect(await contractFixedSwap.isAdmin(adminUser.address)).to.equal(true);
  });

  it('Should the owner set withdraw address and can withdraw all funds', async function () {

    // Admin top up payable token to contract
    await bUSDToken.transfer(contractFixedSwap.address, pe("2000"));
    const balanceFund = await bUSDToken.balanceOf(contractFixedSwap.address);

    // Set withdraw address
    await contractFixedSwap.setWithdrawAddress(withdrawUser.address);

    // Withdraw
    await contractFixedSwap.withdrawFund(bUSDToken.address, pe("2000"));
    expect(await bUSDToken.balanceOf(withdrawUser.address)).to.equal(balanceFund.toString());

  });

  it('Should place order successfully - whitelist', async function () {

    // Set maxBuyBoxPerAddress
    const pool = await contractFixedSwap.pools(poolId)
    const maxBuyPerAddress = 2;
    await contractFixedSwap.handlePublicPool(poolId, false);
    // const whitelistIds = await contractFixedSwap.getWhitelistIds(poolId);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, pool.requireWhitelist, maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("50")); // 50

    // Should reverted because quantity = 0
    quantity = 0;
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.reverted;

    quantity = 1;
    // Should reverted because not enough BUSD
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.reverted;

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("250")); // = 300

    // Place Order
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

  });

  it('Should revert place order if not in white list - whitelist', async function () {

    // Not in white list should revert
    await bUSDToken.transfer(invalidUser.address, pe("150"));
    await bUSDToken.connect(invalidUser).approve(contractFixedSwap.address, pe("150"));
    await expect(contractFixedSwap.connect(invalidUser).placeOrder(poolId, quantity)).to.be.revertedWith("Caller is not in whitelist");

  });


  it('Should place order successfully - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    // Allow 10 item
    await contractFixedSwap.handlePublicPool(poolId, false);
    const requireWhitelist = false;
    const maxBuyPerAddress = 10;
    const maxBuyPerOrder = 5;
    const whitelistIds = await contractFixedSwap.getWhitelistIds(poolId);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("2000"));
    await bUSDToken.connect(buyerUser2).approve(contractFixedSwap.address, pe("400"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("2000"));
    await bUSDToken.transfer(buyerUser2.address, pe("400"));


    // Place Order
    quantity = 5;
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity); // Order 0
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity); // Order 1
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Got limited");
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("500"));
    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu((quantity*2).toString()));

    quantity = 2;
    await contractFixedSwap.connect(buyerUser2).placeOrder(poolId, quantity); // Order 2
    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("100"));
    expect(await contractERC20.balanceOf(buyerUser2.address)).to.equal(pu(quantity.toString()));

    /* console.log(await contractFixedSwap.bids(poolId, 0));
    console.log(await contractFixedSwap.bids(poolId, 1));
    console.log(await contractFixedSwap.bids(poolId, 2)); */

  });

  it('Should revert with over maxPerOrder - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    await contractFixedSwap.handlePublicPool(poolId, false);
    const requireWhitelist = false;
    const maxBuyPerOrder = 2;
    // const whitelistIds = await contractFixedSwap.getWhitelistIds(poolId);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress, maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("2000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("2000"));

    // Place Order
    quantity = 2;
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity); // Order 0
    quantity = 3;
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Got limited per order");
  });

  it('Should place order successfully and reverted over max buy allow - whitelist', async function () {
    // Set limit buy
    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("3000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("3000"));
    // Place Order
    quantity = 2;
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    // Should reverted
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Got limited");

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu((quantity*5).toString()));
  });


  it('Should place order successfully & Claimed - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    const requireWhitelist = false;
    await contractFixedSwap.handlePublicPool(poolId, false);
    // const whitelistIds = await contractFixedSwap.getWhitelistIds(poolId);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("300"));

    // Place Order with Flat price
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

    expect(await contractERC20.balanceOf(buyerUser.address)).to.equal(pu("1"));
  });


  it('Should reverted place order when pool has been not start or expired - whitelist', async function () {
    // Approve & top up BUSD
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("150"));
    await bUSDToken.transfer(buyerUser.address, pe("150"));

    const pool = await contractFixedSwap.pools(poolId)
    const timeNotStart = Math.round(new Date().getTime()/1000) + 86400*2; // Today plus 2 days
    await contractFixedSwap.handlePublicPool(poolId, false);
    // const whitelistIds = await contractFixedSwap.getWhitelistIds(poolId);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, timeNotStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);
    // Should reverted
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Not Started");

    const timeStart = Math.round(new Date().getTime()/1000) - 86400*2; // Today plus 2 days
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.addressPayable,pool.totalItems, timeStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);
    // Now
    // Bought success
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    const START_TIME = Math.floor(Date.now() / 1000);
    const increaseDays = 600;
    const increaseTime = parseInt(START_TIME) - Math.floor(Date.now() / 1000) + 86400 * (increaseDays - 1);

    await ethers.provider.send("evm_increaseTime", [increaseTime]);
    await ethers.provider.send("evm_mine", []) // force mine the next block

    // Should reverted
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Expired");;

  });

});