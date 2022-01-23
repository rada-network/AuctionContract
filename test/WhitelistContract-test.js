
// We import Chai to use its asserting functions here.
const {
  expect
} = require("chai");
const {
  ethers,
  upgrades
} = require('hardhat');

describe("Whitelist Contract", function () {

  let contractWhitelist;

  beforeEach(async function () {

    [owner, approvalUser, adminUser, invalidUser, user1, user2, user3, user4, user5, user6, user7, ...addrs] = await ethers.getSigners();

    // Get the ContractFactory
    const WhitelistContract = await ethers.getContractFactory("WhitelistContract");
    contractWhitelist = await upgrades.deployProxy(WhitelistContract, { kind: 'uups' });

    // Set admin for WhitelistContract
    await contractWhitelist.setAdmin(adminUser.address, true);

    var title = "Raders";
    var whitelist = [
      user1.address,
      user2.address,
      user3.address,
    ];

    // Add list
    await contractWhitelist.addList(title, whitelist);


    title = "CoinCu";
    whitelist = [
      user4.address,
      user5.address,
      user6.address,
    ];
    // Add list
    await contractWhitelist.addList(title, whitelist);

  });

  it('Deploy v1 and should set right admin', async function () {
    expect(await contractWhitelist.isAdmin(adminUser.address)).to.equal(true);
  });

  it('Should valid user in whitelist', async function () {
    expect(await contractWhitelist.isValid(user2.address, [0,1])).to.equal(true);
  });

  it('Should add new List and check isValid', async function () {



    expect(await contractWhitelist.isValid(user5.address, [0,1])).to.equal(true);

    expect(await contractWhitelist.isValid(invalidUser.address, [0])).to.equal(false);
    expect(await contractWhitelist.isValid(invalidUser.address, [1])).to.equal(false);

  });

  it('Should update List and check isValid', async function () {

    listId = 1;
    const title = "CoinCu 2";
    const whitelist = [
      user5.address,
      user7.address,
    ];
    const allow = false;
    // Add list
    await contractWhitelist.updateList(listId, title, whitelist, allow);

    expect(await contractWhitelist.isValid(user4.address, [0,1])).to.equal(true);
    expect(await contractWhitelist.isValid(user5.address, [0,1])).to.equal(false);

    const listAddress = await contractWhitelist.getListAddress(listId);
    expect(listAddress.length).to.equal(4);
  });
});