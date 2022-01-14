// We import Chai to use its asserting functions here.
const { expect } = require('chai')
const { ethers, upgrades } = require('hardhat')

describe('IDOClaimContract', function () {
    let bUSDToken
    let contractIDOClaim
    let contractBoxToken
    let contractNFTMan
    let contractRadaNFT
    let poolId
    let tokenAddress
    let tokenPrice
    let tokenAllocationBusd
    let nftAddress
    let buyerUser

    const MINTER_ROLE =
        '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'
    const URL_BASE = 'https://nft.1alo.com/v1/rada/'

    // Utils
    const pe = (num) => ethers.utils.parseEther(num) // parseEther
    const fe = (num) => ethers.utils.formatEther(num) // formatEther
    const pu = (num, decimals = 0) => ethers.utils.parseUnits(num, decimals) // parseUnits
    const fu = (num, decimals = 0) => ethers.utils.formatUnits(num, decimals) // formatEther

    beforeEach(async function () {
        ;[owner, adminUser, minterFactoryUser, buyerUser] =
            await ethers.getSigners()

        // BUSD
        const BUSDToken = await ethers.getContractFactory('BUSDToken')
        bUSDToken = await BUSDToken.deploy()

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
        tokenAddress = contractBoxToken.address
        tokenPrice = pe('1')
        tokenAllocationBusd = pe('1000')

        // NFTMan Add Pool
        const startId = 20001
        const endId = 20003
        tokenAddress = contractBoxToken.address
        nftAddress = contractRadaNFT.address

        await contractNFTMan.addPool(poolId, nftAddress, tokenAddress)
        await contractNFTMan.updatePool(
            poolId,
            nftAddress,
            startId,
            endId,
            tokenAddress
        )

        // IDOClaim Add Pool
        await contractIDOClaim.addPool(
            poolId,
            tokenAddress,
            tokenPrice,
            tokenAllocationBusd
        )

        // updateRarityAllocations
        await contractIDOClaim.updateRarityAllocations(
            poolId,
            [1, 2, 3],
            [500, 300, 200]
        )

        // Rada NFT
        await contractRadaNFT.updateBaseURI(URL_BASE)
        // Set approval for NFTMan Contract
        await contractRadaNFT.addApprovalWhitelist(contractIDOClaim.address)
        await contractRadaNFT.addApprovalWhitelist(contractNFTMan.address)

        // Set minterFactory for NFT
        await contractRadaNFT.setMintFactory(contractIDOClaim.address)
        await contractRadaNFT.setMintFactory(contractNFTMan.address)

        // Mint an NFT
        await contractRadaNFT.hasRole(MINTER_ROLE, contractIDOClaim.address)

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

    it('Deploy and set admin address', async function () {})

    it('Publish Pool', async function () {
        expect(await contractIDOClaim.publishPool(poolId))
    })

    it('Unpublish Pool', async function () {
        await contractIDOClaim.publishPool(poolId)
        expect(await contractIDOClaim.unpublishPool(poolId))
    })

    it('Should update Pool when Unpublished', async function () {
        expect(
            await contractIDOClaim.updatePool(
                poolId,
                tokenAddress,
                tokenPrice,
                tokenAllocationBusd
            )
        )
    })

    it('Should not update Pool when Published', async function () {
        await contractIDOClaim.publishPool(poolId)

        await expect(
            contractIDOClaim.updatePool(
                poolId,
                tokenAddress,
                tokenPrice,
                tokenAllocationBusd
            )
        ).to.be.reverted
    })

    it('Should has Deposited Tokens', async function () {
        await contractIDOClaim.publishPool(poolId)

        expect(await contractIDOClaim.getDepositedTokens(poolId)).to.equal(
            pu('1000')
        )
    })

    it('Should be Claimable', async function () {
        await contractIDOClaim.publishPool(poolId)

        expect(
            await contractIDOClaim
                .connect(buyerUser)
                .claim(poolId, [20001, 20002, 20003])
        )
    })
})
