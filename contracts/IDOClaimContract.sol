// SPDX-License-Identifier: MIT
/***********************************************
'...########:::::'###::::'########:::::'###:::::
....##.... ##:::'## ##::: ##.... ##:::'## ##::::
....##:::: ##::'##:. ##:: ##:::: ##::'##:. ##:::
....########::'##:::. ##: ##:::: ##:'##:::. ##::
....##.. ##::: #########: ##:::: ##: #########::
....##::. ##:: ##.... ##: ##:::: ##: ##.... ##::
....##:::. ##: ##:::: ##: ########:: ##:::: ##::
....:::::...::..:::::..::........:::..:::::..:::
***********************************************/

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "hardhat/console.sol";

interface IUpdateERC721 is IERC721Upgradeable {
    struct NFT_INFO {
        bool locked; // Cannot transfer
        uint16 typeNft; // type of NFT
    }

    function burn(uint256 tokenId) external;

    function safeMint(address to, uint256 tokenId) external;

    function handleUse(uint256 _tokenId, bool _used) external;

    function setType(uint256 _tokenId, uint16 _type) external;

    function ownerOf(uint256 tokenId) external view returns (address);

    function items(uint256 tokenId) external view returns (NFT_INFO memory);
}

interface INFTMan {
    struct POOL_INFO {
        address nftAddress;
        uint256 startId; // Start tokenID
        uint256 endId; // End tokenID
    }

    function pools(uint16 _poolId) external view returns (POOL_INFO memory);
}

contract IDOClaimContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    INFTMan nftManContract;

    /**
        DATA Structure
     */
    struct POOL_INFO {
        // IUpdateERC721 nftContract;
        address tokenAddress;
        uint256 tokenPrice;
        uint256 tokenAllocationBusd;
        bool published;
    }
    mapping(uint16 => POOL_INFO) pools;

    struct POOL_RARITY {
        uint16[] ids;
        mapping(uint16 => uint256) allocationBusd;
    }
    mapping(uint16 => POOL_RARITY) rarityAllocations;

    // Operation
    mapping(address => bool) admins;
    uint16[] poolIds;

    // nftId => claimed token
    mapping(uint256 => uint256) claimedTokens;
    uint256 totalClaimedTokens;

    event TokenClaimed(address buyerAddress, uint256 claimedTokens);

    function initialize(address _nftManAddress) public initializer {
        nftManContract = INFTMan(_nftManAddress);

        __Ownable_init();
        // Default grant the admin role to a specified account
        admins[owner()] = true;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
        Modifiers
     */
    modifier onlyAdmin() {
        require(admins[_msgSender()], "Caller is not an admin");
        _;
    }

    /* Admin role who can handle winner list, deposit token */
    function setAdmin(address _address) external onlyOwner {
        require(!admins[_address], "Already Admin"); // Already Admin
        admins[_address] = true;
    }
    function removeAdmin(address _address) external onlyOwner {
        require(admins[_address], "Not an Admin"); // Not an Admin
        admins[_address] = false;
    }

    function isAdmin(address _address) external view onlyAdmin returns(bool) {
        return admins[_address];
    }

    function getPool(uint16 _poolId) external view onlyAdmin returns (POOL_INFO memory) {
        return pools[_poolId];
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // add / update Pool
    /**
        SETTER
     */
    // Add/update pool - by Admin
    // 844 bytes
    function addPool(
        uint16 _poolId,
        address _tokenAddress,
        uint256 _tokenPrice,
        uint256 _tokenAllocationBusd
    ) external onlyAdmin {
        // validate input
        require(_tokenPrice > 0, "Invalid Price");
        require(_tokenAllocationBusd > 0, "Invalid Allocation");

        // check existed
        require(pools[_poolId].tokenPrice == 0, "Pool Existed");

        POOL_INFO memory pool;
        pool.tokenAddress = _tokenAddress;
        pool.tokenPrice = _tokenPrice;
        pool.tokenAllocationBusd = _tokenAllocationBusd;
        // add pool
        pools[_poolId] = pool;

        // add pool id
        poolIds.push(_poolId);
    }

    // 1219 bytes
    function updatePool(
        uint16 _poolId,
        address _tokenAddress,
        uint256 _tokenPrice,
        uint256 _tokenAllocationBusd
    ) external onlyAdmin {
        POOL_INFO memory pool = pools[_poolId]; // pool info
        // require pool existed and not published
        require(pool.tokenPrice > 0, "Pool not existed");
        require(!pool.published, "Published already");

        // do update
        if (_tokenAddress != address(0))
            pools[_poolId].tokenAddress = _tokenAddress;
        if (_tokenPrice > 0) pools[_poolId].tokenPrice = _tokenPrice;
        if (_tokenAllocationBusd > 0)
            pools[_poolId].tokenAllocationBusd = _tokenAllocationBusd;
    }

    function updateRarityAllocations(
        uint16 _poolId,
        uint16[] memory _rarityIds,
        uint256[] memory _rarityAllocationsBusd
    ) external virtual onlyAdmin {
        POOL_INFO memory pool = pools[_poolId]; // pool info
        // require pool existed and not published
        require(pool.tokenPrice > 0, "Pool not existed");
        require(!pool.published, "Published already");
        // verify input
        require(
            _rarityIds.length > 0 &&
                _rarityAllocationsBusd.length == _rarityIds.length,
            "Invalid Rarity Allocations"
        );

        // reset current allocation if existed
        uint16[] memory _currentRarityIds = rarityAllocations[_poolId].ids;
        if (_currentRarityIds.length > 0) {
            for (uint256 i; i < _currentRarityIds.length; i++) {
                rarityAllocations[_poolId].allocationBusd[
                    _currentRarityIds[i]
                ] = 0;
            }
        }
        rarityAllocations[_poolId].ids = _rarityIds;
        for (uint256 i; i < _rarityIds.length; i++) {
            require(_rarityAllocationsBusd[i] > 0, "Invalid Allocation");
            rarityAllocations[_poolId].allocationBusd[
                _rarityIds[i]
            ] = _rarityAllocationsBusd[i];
        }
    }

    function publishPool(uint16 _poolId) external virtual onlyAdmin {
        POOL_INFO memory pool = pools[_poolId];
        require(!pool.published, "Already published");
        // check nftman pool existed
        address _nftAddress = nftManContract.pools(_poolId).nftAddress;
        require(_nftAddress != address(0), "Missing Pool in NFTMan");
        // make sure all require info are set
        require(pool.tokenPrice != 0, "Missing Token Price");
        require(pool.tokenAllocationBusd != 0, "Missing Token Allocation");
        // check rarity allocation
        require(
            rarityAllocations[_poolId].ids.length > 0,
            "Missing Rarity Allocations"
        );

        // init nftcontract
        // pools[_poolId].nftContract = IUpdateERC721(
        //     nftManContract.pools(_poolId).nftAddress
        // );
        // public pool
        pools[_poolId].published = true;
    }

    // in case need make any update to pool after published
    function unpublishPool(uint16 _poolId) external virtual onlyOwner {
        require(pools[_poolId].published, "Not published");
        pools[_poolId].published = false;
    }

    function getNftAllocationBusd(uint16 _poolId, uint256 _nftId)
        public
        view
        returns (uint256)
    {
        uint256 _startId = nftManContract.pools(_poolId).startId;
        uint256 _endId = nftManContract.pools(_poolId).endId;

        if (_nftId < _startId || _nftId > _endId) return 0;

        IUpdateERC721 nftContract = IUpdateERC721(nftManContract.pools(_poolId).nftAddress);
        uint16 nftType = nftContract.items(_nftId).typeNft;
        return rarityAllocations[_poolId].allocationBusd[nftType];
    }

    function getNftAllocation(uint16 _poolId, uint256 _nftId)
        public
        view
        returns (uint256)
    {
        return _busdToToken(_poolId, getNftAllocationBusd(_poolId, _nftId));
    }

    function getClaimable(uint16 _poolId, uint256[] memory _nftIds)
        public
        view
        returns (uint256[] memory claimables)
    {
        claimables = new uint256[](_nftIds.length + 1);

        POOL_INFO memory pool = pools[_poolId];
        uint256 _totalClaimable;

        IERC20Upgradeable tokenContract = IERC20Upgradeable(
            pools[_poolId].tokenAddress
        );
        uint256 _tokenBalance = tokenContract.balanceOf(address(this));
        uint256 _totalDeposited = totalClaimedTokens.add(_tokenBalance);

        uint256 _ratioDeposited = _totalDeposited.mul(pool.tokenPrice).div(
            pool.tokenAllocationBusd
        );
        IUpdateERC721 nftContract = IUpdateERC721(nftManContract.pools(_poolId).nftAddress);
        for (uint256 i; i < _nftIds.length; i++) {
            uint256 _nftId = _nftIds[i];
            require(
                nftContract.ownerOf(_nftId) == _msgSender(),
                "Invalid NFT"
            );
            uint256 _allocation = getNftAllocation(_poolId, _nftId);
            uint256 _claimable = _allocation.mul(_ratioDeposited).div(1e18);
            // current claimable for nftId
            claimables[i] = _claimable > claimedTokens[_nftId]
                ? _claimable.sub(claimedTokens[_nftId])
                : 0;
            // check available token
            if (_totalClaimable + claimables[i] > _tokenBalance) {
                claimables[i] = _tokenBalance.sub(_totalClaimable);
            }
            _totalClaimable += claimables[i];
        }
        claimables[_nftIds.length] = _totalClaimable;
    }

    // main function, claim
    function claim(uint16 _poolId, uint256[] memory _nftIds) external virtual {
        POOL_INFO memory pool = pools[_poolId];
        require(pool.published, "Pool not available");
        require(pool.tokenAddress != address(0), "Token not available");

        uint256[] memory _claimables = getClaimable(_poolId, _nftIds);
        uint256 _totalClaimable = _claimables[_claimables.length - 1];
        require(_totalClaimable > 0, "No claimable tokens");

        // ready to transfer, update claimedTokens
        for (uint256 i; i < _nftIds.length; i++) {
            uint256 _nftId = _nftIds[i];
            claimedTokens[_nftId] += _claimables[i];
        }

        // transfer
        IERC20Upgradeable tokenContract = IERC20Upgradeable(
            pools[_poolId].tokenAddress
        );
        tokenContract.safeTransfer(_msgSender(), _totalClaimable);

        emit TokenClaimed(_msgSender(), _totalClaimable);
    }

    function getDepositedTokens(uint16 _poolId) public view returns (uint256) {
        IERC20Upgradeable tokenContract = IERC20Upgradeable(
            pools[_poolId].tokenAddress
        );
        return totalClaimedTokens.add(tokenContract.balanceOf(address(this)));
    }

    function _busdToToken(uint16 _poolId, uint256 _busd)
        internal
        view
        returns (uint256)
    {
        return _busd.mul(1e18).div(pools[_poolId].tokenPrice);
    }
}
