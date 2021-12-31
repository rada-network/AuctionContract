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

describe("OpenBox - NFT Contract", function () {

  let contractOpenBox;
  let contractNFT;
  let contractERC20;
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

    [owner, approvalUser, adminUser, minterFactoryUser, nftUser, otherUser, ...addrs] = await ethers.getSigners();

    const RadaNftContract = await ethers.getContractFactory("RadaNftContract");
    contractNFT = await RadaNftContract.deploy();

    // Get the ContractFactory
    const OpenBoxContract = await ethers.getContractFactory("OpenBoxContract");
    contractOpenBox = await upgrades.deployProxy(OpenBoxContract, { kind: 'uups' });

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



    tokenId = "100001";
    poolId = 10;
    // Mint an NFT
    await contractNFT.connect(minterFactoryUser).safeMint(nftUser.address, tokenId);
    // Set isBox
    await contractNFT.connect(minterFactoryUser).setBox(tokenId, true);

    addressItem = contractNFT.address;
    const startId = 20001;
    const endId = 20100;
    const title = "Open Box #10"
    // Add pool
    await contractOpenBox.addPool(poolId, addressItem);
    await contractOpenBox.updatePool(poolId, title, addressItem, startId, endId);

  });

  it('Deploy v1 and should set right minterFactory address, right approval address', async function () {
    expect(await contractNFT.hasRole(MINTER_ROLE, minterFactoryUser.address)).to.equal(true);
    expect(await contractNFT.approvalWhitelists(contractOpenBox.address)).to.equal(true);
  });

  it('Should open the box', async function () {
    // Should reverted
    await expect(contractOpenBox.connect(otherUser).openBox(poolId, tokenId)).to.be.revertedWith("Caller must be owner");;

    // Should open box
    await contractOpenBox.connect(nftUser).openBox(poolId, tokenId);
    expect(await contractNFT.tokenOfOwnerByIndex(nftUser.address, 0)).to.equal(pu("20001"));

  });
  it('Should update type rarity of NFT', async function () {

    const typeRarity = pu("9");
    // Should reverted
    await expect(contractOpenBox.connect(otherUser).updateNFT(poolId, tokenId, typeRarity)).to.be.revertedWith("Caller is not an admin");;

    // Should open box
    await contractOpenBox.connect(nftUser).openBox(poolId, tokenId);

    const tokenIdNft = pu("20001");
    // Should update type NFT
    await contractOpenBox.connect(adminUser).updateNFT(poolId, tokenIdNft, typeRarity);
    expect(await contractNFT.tokenOfOwnerByIndex(nftUser.address, 0)).to.equal(tokenIdNft);

    const item = await contractNFT.items(tokenIdNft);
    // console.log(fu(await contractNFT.items(tokenIdNft).typeNft))
    expect(fu(item.typeNft)).to.equal(typeRarity);

  });
});