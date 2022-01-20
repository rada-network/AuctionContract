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

describe("Fixed Swap Contract - NFT", function () {

  let contractFixedSwap;
  let contractNFT;
  let addressItem;
  let bUSDToken;
  let poolId;
  let quantity;
  let priceEach;
  let tokenIdStart;
  let tokenIdEnd;
  let saleTokenIds = [];


  // Utils
  const pe = (num) => ethers.utils.parseEther(num) // parseEther
  const fe = (num) => ethers.utils.formatEther(num) // formatEther
  const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
  const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

  beforeEach(async function () {

    [owner, approvalUser, adminUser, withdrawUser, buyerUser, buyerUser2, ...addrs] = await ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BUSDToken");
    bUSDToken = await BUSDToken.deploy();

    const RadaNftContract = await ethers.getContractFactory("RadaNftContract");
    contractNFT = await RadaNftContract.deploy();

    // Get the ContractFactory
    const NFTFixedSwapContract = await ethers.getContractFactory("NFTFixedSwapContract");
    contractFixedSwap = await upgrades.deployProxy(NFTFixedSwapContract, [bUSDToken.address], {
      kind: 'uups'
    });

    /* NFTFixedSwapContract */
    // Set minter
    await contractFixedSwap.setAdmin(adminUser.address, true);

    // Set owner is minterFactory for NFT
    await contractNFT.setMintFactory(owner.address);
    // Mint 500 NFT to Sale Contract
    tokenIdStart = 500;
    tokenIdEnd = 549;

    saleTokenIds = [];
    for (let i=tokenIdStart;i<=tokenIdEnd;i++) {
      await contractNFT.safeMint(contractFixedSwap.address, i);
      saleTokenIds.push(i);
    }
    poolId = 10;
    quantity = 1;
    priceEach = pe("150");
    addressItem = contractNFT.address;
    const maxBuyPerAddress = 10;
    const maxBuyPerOrder = 2;
    const requireWhitelist = true;
    const isPublic = true;
    const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
    const endTime = Math.floor(Date.now() / 1000) + 86400*7; // Now + 7 days

    // Add/update pool
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, addressItem, startTime, endTime, priceEach, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
    await contractFixedSwap.updateSalePool(poolId, saleTokenIds);
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
    await contractFixedSwap.withdrawFund(bUSDToken.address, pe("2000"), []);
    expect(await bUSDToken.balanceOf(withdrawUser.address)).to.equal(balanceFund.toString());

  });

  it('Should place order successfully - whitelist', async function () {
    // Set white list
    await contractFixedSwap.setWhitelist(poolId, [buyerUser.address, buyerUser2.address], true);
    // Set maxBuyBoxPerAddress
    const pool = await contractFixedSwap.pools(poolId);
    const maxBuyPerOrder = 2;
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem,  pool.startTime, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress, maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("500"));
    await bUSDToken.connect(buyerUser2).approve(contractFixedSwap.address, pe("5000"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("50")); // 50
    await bUSDToken.transfer(buyerUser2.address, pe("5000")); // 50

    // Should reverted because quantity = 0
    quantity = 0;
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.reverted;

    quantity = 2;
    // Should reverted because not enough BUSD
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.reverted;

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("350")); // = 300

    // Place Order Buyer 1
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);
    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("100"));
    expect(await contractNFT.balanceOf(buyerUser.address)).to.equal(quantity);
    expect(await contractNFT.ownerOf(500)).to.equal(buyerUser.address);
    expect(await contractNFT.ownerOf(501)).to.equal(buyerUser.address);
    expect(await contractNFT.ownerOf(502)).to.not.equal(buyerUser.address);

    quantity = 1;
    // Place Order Buyer 2
    await contractFixedSwap.connect(buyerUser2).placeOrder(poolId, quantity);
    expect(await contractNFT.balanceOf(buyerUser2.address)).to.equal(quantity);
    expect(await contractNFT.ownerOf(502)).to.equal(buyerUser2.address);

  });

  it('Should revert place order if not in white list - whitelist', async function () {

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("300"));
    // Not in white list should revert
    await bUSDToken.transfer(buyerUser2.address, pe("150"));
    await bUSDToken.connect(buyerUser2).approve(contractFixedSwap.address, pe("150"));
    // await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.reverted;
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Caller is not in whitelist");

  });


  it('Should place order successfully - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    // Allow 10 item
    await contractFixedSwap.handlePublicPool(poolId, false);
    const requireWhitelist = false;
    const maxBuyPerAddress = 10;
    const maxBuyPerOrder = 5;
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, maxBuyPerAddress, maxBuyPerOrder);
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
    expect(await contractNFT.balanceOf(buyerUser.address)).to.equal(pu((quantity*2).toString()));

    quantity = 2;
    await contractFixedSwap.connect(buyerUser2).placeOrder(poolId, quantity); // Order 2
    expect(await bUSDToken.balanceOf(buyerUser2.address)).to.equal(pe("100"));
    expect(await contractNFT.balanceOf(buyerUser2.address)).to.equal(pu(quantity.toString()));

  });

  it('Should revert with over maxPerOrder - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    await contractFixedSwap.handlePublicPool(poolId, false);
    const requireWhitelist = false;
    const maxBuyPerOrder = 2;
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress, maxBuyPerOrder);
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
    // Set white list
    await contractFixedSwap.setWhitelist(poolId, [buyerUser.address], true);

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

    expect(await contractNFT.balanceOf(buyerUser.address)).to.equal(pu((quantity*5).toString()));
  });


  it('Should place order successfully & Claimed - public', async function () {
    // Set white list
    const pool = await contractFixedSwap.pools(poolId)
    const requireWhitelist = false;
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, pool.startTime, pool.endTime, pool.startPrice, requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);

    // Approve allowance
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("300"));

    // Admin top up payable token to user
    await bUSDToken.transfer(buyerUser.address, pe("300"));

    // Place Order with Flat price
    await contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity);

    expect(await bUSDToken.balanceOf(buyerUser.address)).to.equal(pe("150"));

    expect(await contractNFT.balanceOf(buyerUser.address)).to.equal(pu("1"));
  });


  it('Should reverted place order when pool has been not start or expired - whitelist', async function () {
    // Approve & top up BUSD
    await bUSDToken.connect(buyerUser).approve(contractFixedSwap.address, pe("150"));
    await bUSDToken.transfer(buyerUser.address, pe("150"));

    // Set white list
    await contractFixedSwap.setWhitelist(poolId, [buyerUser.address], true);
    const pool = await contractFixedSwap.pools(poolId)
    const timeNotStart = Math.round(new Date().getTime()/1000) + 86400*2; // Today plus 2 days
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, timeNotStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
    await contractFixedSwap.handlePublicPool(poolId, true);
    // Should reverted
    await expect(contractFixedSwap.connect(buyerUser).placeOrder(poolId, quantity)).to.be.revertedWith("Not Started");

    const timeStart = Math.round(new Date().getTime()/1000) - 86400*2; // Today plus 2 days
    await contractFixedSwap.handlePublicPool(poolId, false);
    await contractFixedSwap.addOrUpdatePool(poolId, pool.addressItem, timeStart, pool.endTime, pool.startPrice, pool.requireWhitelist, pool.maxBuyPerAddress, pool.maxBuyPerOrder);
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