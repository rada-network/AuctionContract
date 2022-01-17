
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

describe("NFTMan Contract", function () {

  let contractNFTMan;
  let contractNFT;
  let contractTokenBox;
  let poolId;
  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
  const URL_BASE = "https://nft.1alo.com/v1/rada/";

  // Utils
  const pe = (num) => ethers.utils.parseEther(num) // parseEther
  const fe = (num) => ethers.utils.formatEther(num) // formatEther
  const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
  const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

  beforeEach(async function () {

    [owner, approvalUser, adminUser, minterFactoryUser, buyerUser, otherUser, ...addrs] = await ethers.getSigners();

    const RadaNftContract = await ethers.getContractFactory("RadaNftContract");
    contractNFT = await RadaNftContract.deploy();

    // Get the ContractFactory
    const NFTManContract = await ethers.getContractFactory("NFTManContract");
    contractNFTMan = await upgrades.deployProxy(NFTManContract, { kind: 'uups' });

    const ERC20Token = await ethers.getContractFactory("BoxToken");
    contractTokenBox = await ERC20Token.deploy();

    /* NFT */
    // Set updateBaseURI
    await contractNFT.updateBaseURI(URL_BASE);
    // Set approval for NFTMan Contract
    await contractNFT.addApprovalWhitelist(minterFactoryUser.address);
    await contractNFT.addApprovalWhitelist(contractNFTMan.address);

    // Set minterFactory for NFT
    await contractNFT.setMintFactory(minterFactoryUser.address);
    await contractNFT.setMintFactory(contractNFTMan.address);

    // Set admin for NFTManContract
    await contractNFTMan.setAdmin(adminUser.address, true);




  });

  it('Deploy v1 and should set right minterFactory address, right approval address', async function () {
    expect(await contractNFT.hasRole(MINTER_ROLE, minterFactoryUser.address)).to.equal(true);
    expect(await contractNFT.approvalWhitelists(contractNFTMan.address)).to.equal(true);
  });

  describe("NFTMan - TokenBox", function () {
    beforeEach(async function () {
      const buyBoxes = 10;
      poolId = 10;
      // Transfer token Box to buyer
      await contractTokenBox.connect(owner).transfer(buyerUser.address, buyBoxes);

      nftAddress = contractNFT.address;
      const startId = 20001;
      const endId = 20100;
      const tokenAddress = contractTokenBox.address;
      const startTime = Math.floor(Date.now() / 1000) - 86400*1; // Now - 1 day
      // Add pool
      await contractNFTMan.addOrUpdatePool(poolId, nftAddress, startId, endId, tokenAddress, startTime);

    });
    it('Should open the box', async function () {
      var openBoxes = 100;

      // Should reverted
      await expect(contractNFTMan.connect(otherUser).openBox(poolId, openBoxes)).to.be.revertedWith("Not enough Token");

      openBoxes = 5;
      await contractTokenBox.connect(buyerUser).approve(contractNFTMan.address, openBoxes);
      // Should open box
      await contractNFTMan.connect(buyerUser).openBox(poolId, openBoxes);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("20001"));

    });

    it('Should update type rarity of NFT', async function () {

      var typeRarity, item, openBoxes;
      typeRarity = pu("9");
      openBoxes = 100;
      // Should reverted
      await expect(contractNFTMan.connect(otherUser).updateNFT(poolId, openBoxes, typeRarity)).to.be.revertedWith("Caller is not an admin");

      // Should open box
      openBoxes = 5;
      await contractTokenBox.connect(buyerUser).approve(contractNFTMan.address, openBoxes);
      await contractNFTMan.connect(buyerUser).openBox(poolId, openBoxes);

      const tokenIdNft_1 = pu("20001");
      const tokenIdNft_5 = pu("20005");
      // Should update type NFT 1
      typeRarity = pu("9");
      await contractNFTMan.connect(adminUser).updateNFT(poolId, tokenIdNft_1, typeRarity);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(tokenIdNft_1);
      item = await contractNFT.items(tokenIdNft_1);
      expect(fu(item.typeNft)).to.equal(typeRarity);

      // Should update type NFT 5
      typeRarity = pu("4");
      await contractNFTMan.connect(adminUser).updateNFT(poolId, tokenIdNft_5, typeRarity);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 4)).to.equal(tokenIdNft_5);
      item = await contractNFT.items(tokenIdNft_5);
      expect(fu(item.typeNft)).to.equal(typeRarity);

    });
  });
});