// We import Chai to use its asserting functions here.
const { expect } = require('chai')
const { ethers, upgrades } = require('hardhat')

describe('IDOClaimContract', function () {
    let contractIDOClaim
    let contractBoxToken
    let contractNFTMan
    let contractRadaNFT
    let contractToken
    let poolId
    let boxTokenAddress
    let tokenAddress
    let tokenPrice
    let tokenAllocationBusd
    let nftAddress
    let buyerUser

    // Utils
    const pe = (num) => ethers.utils.parseEther(num) // parseEther
    const fe = (num) => ethers.utils.formatEther(num) // formatEther
    const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
    const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

    beforeEach(async function () {
        ;[owner, adminUser, minterFactoryUser, buyerUser] =
            await ethers.getSigners()

        // Token Address
        const Token = await ethers.getContractFactory('ERC20Token')
        contractToken = await Token.deploy('TOKEN', 'TOKEN')
        contractToken = await contractToken.deployed()
        tokenAddress = contractToken.address

        // BoxToken
        const BoxToken = await ethers.getContractFactory('BoxToken')
        contractBoxToken = await BoxToken.deploy()

        // Rada NFT
        const RadaNftContract = await ethers.getContractFactory(
            'RadaNftContract'
        )
        contractRadaNFT = await RadaNftContract.deploy()

        // NFT Man
        const NFTManContract = await ethers.getContractFactory('NFTManContract')
        contractNFTMan = await upgrades.deployProxy(NFTManContract)

        // IDOClaim
        const IDOClaimContract = await ethers.getContractFactory(
            'IDOClaimContract'
        )
        contractIDOClaim = await upgrades.deployProxy(IDOClaimContract, [
            contractNFTMan.address,
        ])

        await contractBoxToken.transfer(contractIDOClaim.address, pu('1000'))

        poolId = 10
        boxTokenAddress = contractBoxToken.address
        tokenPrice = pe('1')
        tokenAllocationBusd = pe('1000')

        // NFTMan Add Pool
        const startId = 20001
        const endId = 20003
        nftAddress = contractRadaNFT.address

        await contractNFTMan.addPool(poolId, nftAddress, boxTokenAddress)
        await contractNFTMan.updatePool(
            poolId,
            nftAddress,
            startId,
            endId,
            boxTokenAddress
        )

        // Set approval for NFTMan Contract
        await contractRadaNFT.addApprovalWhitelist(contractIDOClaim.address)
        await contractRadaNFT.addApprovalWhitelist(contractNFTMan.address)

        // Set minterFactory for NFT
        await contractRadaNFT.setMintFactory(contractIDOClaim.address)
        await contractRadaNFT.setMintFactory(contractNFTMan.address)

        // Set admin for NFTManContract
        await contractNFTMan.setAdmin(adminUser.address, true)

        // Openbox
        const openBoxes = 5
        await contractBoxToken
            .connect(owner)
            .transfer(buyerUser.address, openBoxes)

        await contractBoxToken
            .connect(buyerUser)
            .approve(contractNFTMan.address, openBoxes)

        // Should open box
        await contractNFTMan.connect(buyerUser).openBox(poolId, openBoxes)

        await contractNFTMan
            .connect(adminUser)
            .updateNFT(poolId, 20001, pu('1'))

        await contractNFTMan
            .connect(adminUser)
            .updateNFT(poolId, 20002, pu('2'))

        await contractNFTMan
            .connect(adminUser)
            .updateNFT(poolId, 20003, pu('3'))

        await contractRadaNFT.tokenOfOwnerByIndex(buyerUser.address, 0)
    })

    const addPool = async (poolId) => {
        await contractIDOClaim
            .connect(adminUser)
            .addPool(poolId, tokenAddress, tokenPrice, tokenAllocationBusd)
    }

    const updatePool = async (poolId) => {
        await contractIDOClaim
            .connect(adminUser)
            .updatePool(
                poolId,
                '0x04765e334e19adFDbA244B66C4BB88a324110d57',
                pe('2'),
                pe('2000')
            )
    }

    const updateRarityAllocations = async (poolId) => {
        await contractIDOClaim
            .connect(adminUser)
            .updateRarityAllocations(poolId, [1, 2, 3], [500, 300, 200])
    }

    it('Should set admin address', async function () {
        // Not owner
        await expect(
            contractIDOClaim
                .connect(buyerUser.address)
                .setAdmin(adminUser.address)
        ).to.be.reverted

        expect(contractIDOClaim.setAdmin(adminUser.address))
    })

    it('Add Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)

        // Not admin
        expect(await contractIDOClaim.admins(buyerUser.address)).to.equal(false)

        // Pool Existed
        await addPool(poolId)
        await expect(addPool(poolId)).to.be.reverted

        const pool = await contractIDOClaim.pools(poolId)

        expect(pool.tokenPrice).to.equal(tokenPrice)
        expect(pool.tokenAllocationBusd).to.equal(tokenAllocationBusd)
        expect(pool.tokenAddress).to.equal(tokenAddress)
    })

    it('Update Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)

        // Not admin
        expect(await contractIDOClaim.admins(buyerUser.address)).to.equal(false)

        // Not existed
        await expect(updatePool(poolId)).to.be.reverted

        //  Update Rarity Allocations not existed Pool
        await expect(updateRarityAllocations(poolId)).to.be.reverted

        await addPool(poolId)

        // Published  Missing Rarity Allocations
        await expect(contractIDOClaim.connect(adminUser).publishPool(poolId)).to
            .be.reverted

        await updateRarityAllocations(poolId)
        await contractIDOClaim.connect(adminUser).publishPool(poolId)

        // Update with Published
        await expect(updatePool(poolId)).to.be.reverted

        // Unpublish without owner
        await expect(contractIDOClaim.connect(adminUser).unpublishPool(poolId))
            .to.be.reverted

        await contractIDOClaim.unpublishPool(poolId)
        await updatePool(poolId)

        const pool = await contractIDOClaim.pools(poolId)

        expect(pool.tokenPrice).to.equal(pe('2'))
        expect(pool.tokenAllocationBusd).to.equal(pe('2000'))
        expect(pool.tokenAddress).to.equal(
            '0x04765e334e19adFDbA244B66C4BB88a324110d57'
        )
    })

    it('Should be Claimable', async function () {
        await contractToken.mint(contractIDOClaim.address, pe('10000'))
        await contractIDOClaim.setAdmin(adminUser.address)

        await addPool(poolId)
        await updateRarityAllocations(poolId)

        await contractIDOClaim.publishPool(poolId)

        expect(
            await contractIDOClaim
                .connect(buyerUser)
                .claim(poolId, [20001, 20002, 20003])
        )
    })
})
