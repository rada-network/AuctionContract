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

describe("OpenBox Contract", function () {

  let contractOpenBox;
  let contractNFT;
  let contractTokenBox;
  let poolId;
  let tokenId;
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
    const OpenBoxContract = await ethers.getContractFactory("OpenBoxContract");
    contractOpenBox = await upgrades.deployProxy(OpenBoxContract, { kind: 'uups' });

    const ERC20Token = await ethers.getContractFactory("BoxToken");
    contractTokenBox = await ERC20Token.deploy();

    /* NFT */
    // Set updateBaseURI
    await contractNFT.updateBaseURI(URL_BASE);
    // Set approval for OpenBox Contract
    await contractNFT.addApprovalWhitelist(minterFactoryUser.address);
    await contractNFT.addApprovalWhitelist(contractOpenBox.address);

    // Set minterFactory for NFT
    await contractNFT.setMintFactory(minterFactoryUser.address);
    await contractNFT.setMintFactory(contractOpenBox.address);

    // Set admin for OpenBoxContract
    await contractOpenBox.setAdmin(adminUser.address, true);




  });

  it('Deploy v1 and should set right minterFactory address, right approval address', async function () {
    expect(await contractNFT.hasRole(MINTER_ROLE, minterFactoryUser.address)).to.equal(true);
    expect(await contractNFT.approvalWhitelists(contractOpenBox.address)).to.equal(true);
  });

  describe("OpenBox - NFT", function () {
    beforeEach(async function () {
      tokenId = "100001";
      poolId = 10;
      // Mint an NFT
      await contractNFT.connect(minterFactoryUser).safeMint(buyerUser.address, tokenId);
      // Set isBox
      await contractNFT.connect(minterFactoryUser).setBox(tokenId, true);

      nftAddress = contractNFT.address;
      const startId = 20001;
      const endId = 20100;
      const title = "Open Box #10"
      const isSaleToken = false;
      const tokenAddress = ethers.constants.AddressZero;
      const nftBoxAddress = nftAddress;

      // Add pool
      await contractOpenBox.addPool(poolId, title, nftAddress,isSaleToken, tokenAddress, nftBoxAddress);
      await contractOpenBox.updatePool(poolId, title, nftAddress, startId, endId, isSaleToken, tokenAddress, nftBoxAddress);

    });
    it('Should open the box', async function () {
      // Should reverted
      await expect(contractOpenBox.connect(otherUser).openBox(poolId, tokenId)).to.be.revertedWith("Caller must be owner");;

      // Should open box
      await contractOpenBox.connect(buyerUser).openBox(poolId, tokenId);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("20001"));

    });

    it('Should update type rarity of NFT', async function () {

      const typeRarity = pu("9");
      // Should reverted
      await expect(contractOpenBox.connect(otherUser).updateNFT(poolId, tokenId, typeRarity)).to.be.revertedWith("Caller is not an admin");;

      // Should open box
      await contractOpenBox.connect(buyerUser).openBox(poolId, tokenId);

      const tokenIdNft = pu("20001");
      // Should update type NFT
      await contractOpenBox.connect(adminUser).updateNFT(poolId, tokenIdNft, typeRarity);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(tokenIdNft);

      const item = await contractNFT.items(tokenIdNft);
      // console.log(fu(await contractNFT.items(tokenIdNft).typeNft))
      expect(fu(item.typeNft)).to.equal(typeRarity);

    });
  });

  describe("OpenBox - TokenBox", function () {
    beforeEach(async function () {
      const buyBoxes = 10;
      poolId = 10;
      // Transfer token Box to buyer
      await contractTokenBox.connect(owner).transfer(buyerUser.address, buyBoxes);

      nftAddress = contractNFT.address;
      const startId = 20001;
      const endId = 20100;
      const title = "Open Box #10"
      const isSaleToken = true;
      const tokenAddress = contractTokenBox.address;
      const nftBoxAddress = ethers.constants.AddressZero;

      // Add pool
      await contractOpenBox.addPool(poolId, title, nftAddress,isSaleToken, tokenAddress, nftBoxAddress);
      await contractOpenBox.updatePool(poolId, title, nftAddress, startId, endId, isSaleToken, tokenAddress, nftBoxAddress);

    });
    it('Should open the box', async function () {
      // Should reverted
      await expect(contractOpenBox.connect(otherUser).openBox(poolId, tokenId)).to.be.revertedWith("Not enough Token");

      const openBoxes = 5;
      await contractTokenBox.connect(buyerUser).approve(contractOpenBox.address, openBoxes);
      // Should open box
      await contractOpenBox.connect(buyerUser).openBox(poolId, openBoxes);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(pu("20001"));

    });

    it('Should update type rarity of NFT', async function () {

      var typeRarity, item;
      typeRarity = pu("9");
      // Should reverted
      await expect(contractOpenBox.connect(otherUser).updateNFT(poolId, tokenId, typeRarity)).to.be.revertedWith("Caller is not an admin");

      // Should open box
      const openBoxes = 5;
      await contractTokenBox.connect(buyerUser).approve(contractOpenBox.address, openBoxes);
      await contractOpenBox.connect(buyerUser).openBox(poolId, openBoxes);

      const tokenIdNft_1 = pu("20001");
      const tokenIdNft_5 = pu("20005");
      // Should update type NFT 1
      typeRarity = pu("9");
      await contractOpenBox.connect(adminUser).updateNFT(poolId, tokenIdNft_1, typeRarity);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 0)).to.equal(tokenIdNft_1);
      item = await contractNFT.items(tokenIdNft_1);
      expect(fu(item.typeNft)).to.equal(typeRarity);

      // Should update type NFT 5
      typeRarity = pu("4");
      await contractOpenBox.connect(adminUser).updateNFT(poolId, tokenIdNft_5, typeRarity);
      expect(await contractNFT.tokenOfOwnerByIndex(buyerUser.address, 4)).to.equal(tokenIdNft_5);
      item = await contractNFT.items(tokenIdNft_5);
      expect(fu(item.typeNft)).to.equal(typeRarity);

    });
  });
});