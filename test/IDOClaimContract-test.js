// We import Chai to use its asserting functions here.
const { expect } = require('chai')
const { ethers, upgrades } = require('hardhat')

describe('IDOClaimContract', function () {
    let poolId = 10
    let contractIDOClaim,
        contractBoxToken,
        contractNFTMan,
        contractRadaNFT,
        contractToken

    let boxTokenAddress
    let tokenAddress
    let tokenPrice = '0.05'
    let tokenAllocationBusd = '3700'
    let nftAddress
    let buyerUser1, buyerUser2, buyerUser3, user
    let totalClaimedToken = '10000'

    let ntfArray1 = [
        //20001: nftId, 1: rarityId, 500: rarityAllocationsBusd
        [20001, '1', '500'],
        [20002, '2', '300'],
        [20003, '3', '100'],
    ]

    let ntfArray2 = [
        //20004: nftId, 4: rarityId, 1000: rarityAllocationsBusd
        [20004, '4', '1000'],
        [20005, '5', '200'],
        [20006, '6', '100'],
    ]

    let ntfArray3 = [
        //20007: nftId, 7: rarityId, 800: rarityAllocationsBusd
        [20007, '7', '800'],
        [20008, '8', '600'],
        [20009, '9', '100'],
    ]

    const startId = 20001
    const endId = 20010

    // Utils
    const pe = (num) => ethers.utils.parseEther(num) // parseEther
    const fe = (num) => ethers.utils.formatEther(num) // formatEther
    const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
    const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

    beforeEach(async function () {
        ;[
            owner,
            adminUser,
            minterFactoryUser,
            buyerUser1,
            buyerUser2,
            buyerUser3,
            user,
        ] = await ethers.getSigners()

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
        boxTokenAddress = contractBoxToken.address

        // NFTMan Add Pool
        nftAddress = contractRadaNFT.address

        // await contractNFTMan.addOrUpdatePool(poolId, nftAddress, boxTokenAddress)
        await contractNFTMan.addOrUpdatePool(
            poolId,
            nftAddress,
            startId,
            endId,
            boxTokenAddress,
            Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
        )

        await contractNFTMan.handlePublicPool(poolId, true);

        // Set approval for NFTMan Contract
        await contractRadaNFT.addApprovalWhitelist(contractIDOClaim.address)
        await contractRadaNFT.addApprovalWhitelist(contractNFTMan.address)

        // Set minterFactory for NFT
        await contractRadaNFT.setMintFactory(contractIDOClaim.address)
        await contractRadaNFT.setMintFactory(contractNFTMan.address)

        // Set admin for NFTManContract
        await contractNFTMan.setAdmin(adminUser.address, true)

        // setupBox
        setupBox(buyerUser1, ntfArray1)
        setupBox(buyerUser2, ntfArray2)
        setupBox(buyerUser3, ntfArray3)
    })

    const setupBox = async (buyerUser, ntfArray) => {
        const openBoxes = 3
        await contractBoxToken
            .connect(owner)
            .transfer(buyerUser.address, openBoxes)

        await contractBoxToken
            .connect(buyerUser)
            .approve(contractNFTMan.address, openBoxes)

        // Should open box
        await contractNFTMan.connect(buyerUser).openBox(poolId, openBoxes)

        // Update NFT
        ntfArray.forEach(async (ntf) => {
            await contractNFTMan
                .connect(adminUser)
                .updateNFT(poolId, ntf[0], pu(ntf[1]))
        })

        await contractRadaNFT.tokenOfOwnerByIndex(buyerUser.address, 0)
    }

    const addPool = async (poolId) => {
        await contractIDOClaim
            .connect(adminUser)
            .addPool(
                poolId,
                tokenAddress,
                pe(tokenPrice),
                pe(tokenAllocationBusd)
            )
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
            .updateRarityAllocations(
                poolId,
                [
                    ...ntfArray1.map((el) => el[1]),
                    ...ntfArray2.map((el) => el[1]),
                    ...ntfArray3.map((el) => el[1]),
                ],
                [
                    ...ntfArray1.map((el) => pe(el[2])),
                    ...ntfArray2.map((el) => pe(el[2])),
                    ...ntfArray3.map((el) => pe(el[2])),
                ]
            )
    }

    const testMint = async (buyerUser, ntfArray) => {
        const ntfIds = ntfArray.map((el) => el[0])

        await contractIDOClaim.connect(buyerUser).claim(poolId, ntfIds)
        const balance = await contractToken.balanceOf(buyerUser.address)

        const claimableToken = ntfArray
            .map((el) => (totalClaimedToken * el[2]) / tokenAllocationBusd)
            .reduce((sum, curent) => sum + curent, 0)
        expect(parseFloat(claimableToken)).to.equal(parseFloat(fe(balance)))
    }

    it('Should set admin address', async function () {
        // Not owner
        await expect(
            contractIDOClaim
                .connect(buyerUser1.address)
                .setAdmin(adminUser.address)
        ).to.be.reverted

        expect(contractIDOClaim.setAdmin(adminUser.address))
    })

    it('Add Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)

        // Not admin
        expect(await contractIDOClaim.isAdmin(buyerUser1.address)).to.equal(
            false
        )

        // Pool Existed
        await addPool(poolId)
        await expect(addPool(poolId)).to.be.reverted

        const pool = await contractIDOClaim.getPool(poolId)

        expect(pool.tokenPrice).to.equal(pe(tokenPrice))
        expect(pool.tokenAllocationBusd).to.equal(pe(tokenAllocationBusd))
        expect(pool.tokenAddress).to.equal(tokenAddress)
    })

    it('Update Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)

        // Not admin
        expect(await contractIDOClaim.isAdmin(buyerUser1.address)).to.equal(
            false
        )

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

        const pool = await contractIDOClaim.getPool(poolId)

        expect(pool.tokenPrice).to.equal(pe('2'))
        expect(pool.tokenAllocationBusd).to.equal(pe('2000'))
        expect(pool.tokenAddress).to.equal(
            '0x04765e334e19adFDbA244B66C4BB88a324110d57'
        )
    })

    it('Publish Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)
        await addPool(poolId)

        expect(await updateRarityAllocations(poolId))

        expect(await contractIDOClaim.connect(adminUser).publishPool(poolId))
    })

    it('Update Rarity Allocations ', async function () {
        //  Update Rarity Allocations not existed Pool
        await expect(updateRarityAllocations(poolId)).to.be.reverted

        await contractIDOClaim.setAdmin(adminUser.address)
        await addPool(poolId)

        await updateRarityAllocations(poolId)
        await contractIDOClaim.connect(adminUser).publishPool(poolId)

        // Published
        await expect(updateRarityAllocations(poolId)).to.be.reverted

        await contractIDOClaim.unpublishPool(poolId)

        expect(await updateRarityAllocations(poolId))
    })

    it('Unpublish Pool', async function () {
        await contractIDOClaim.setAdmin(adminUser.address)

        // Not existed
        await expect(contractIDOClaim.unpublishPool(poolId)).to.be.reverted

        await addPool(poolId)

        // Not Owner
        await expect(contractIDOClaim.connect(adminUser).unpublishPool(poolId))
            .to.be.reverted

        // Not publish yet
        await expect(contractIDOClaim.unpublishPool(poolId)).to.be.reverted

        await updateRarityAllocations(poolId)
        await contractIDOClaim.connect(adminUser).publishPool(poolId)

        expect(await contractIDOClaim.unpublishPool(poolId))
    })

    it('Should be Claimable', async function () {
        // Pool is not available
        await expect(
            contractIDOClaim
                .connect(buyerUser1)
                .claim(poolId, [ntfArray1[0][0]])
        ).to.be.reverted
        await contractIDOClaim.setAdmin(adminUser.address)
        await addPool(poolId)
        await updateRarityAllocations(poolId)
        // Pool is not publish
        await expect(
            contractIDOClaim
                .connect(buyerUser1)
                .claim(poolId, [ntfArray1[0][0]])
        ).to.be.reverted
        await contractIDOClaim.publishPool(poolId)

        // No Token Amount
        await expect(
            contractIDOClaim
                .connect(buyerUser1)
                .claim(poolId, [ntfArray1[0][0]])
        ).to.be.reverted

        // mint token
        await contractToken.mint(
            contractIDOClaim.address,
            pe(totalClaimedToken)
        )

        // Wrong nftId
        await expect(
            contractIDOClaim.connect(buyerUser1).claim(poolId, [20004])
        ).to.be.reverted

        // Wrong user
        await expect(contractIDOClaim.connect(user).claim(poolId, [20001])).to
            .be.reverted

        // NFT 1
        await testMint(buyerUser1, ntfArray1)
        // NFT 2
        await testMint(buyerUser2, ntfArray2)

        // NFT 3
        ntfArray3.forEach(async (el) => await testMint(buyerUser3, [el]))
    })
})
