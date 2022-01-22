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
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IWhitelist.sol";

contract NFTFixedSwapContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    ERC721HolderUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
        DATA Structure
     */
    struct POOL_INFO {
        address addressItem;
        address addressPayable;
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice; // initialPrice
        bool isPublic; // if isPublic, cannot update pool
        bool ended; // Ended to picker winners
        bool requireWhitelist;
        uint16[] whitelistIds;
        uint256 maxBuyPerAddress;
        uint256 maxBuyPerOrder;
    }

    struct POOL_STATS {
        uint32 totalBid; // Total bid in pool
        uint256 totalBidItem; // Total bid Item in pool
        uint256 totalSold; // Sold total
    }

    struct BID_INFO {
        uint16 poolId;
        address creator; // Owner of bidding
        uint256 priceEach; // Price bidding for each NFT
        uint256 quantity; // quantity
        // uint256[] tokenIds;
    }
    mapping(uint16 => POOL_INFO) public pools;
    mapping(uint16 => uint256[]) public poolSaleTokenIds; // poolId => List tokenId for sale
    uint16[] poolIds;

    mapping(uint16 => POOL_STATS) public poolStats; // poolId => pool stats
    mapping(uint16 => BID_INFO[]) public bids; // poolId => bids
    // mapping(uint256 => uint256[]) public bidTokenIds; // bidIndex => List tokenId for bought

    // Operation
    mapping(address => bool) admins;
    address public WITHDRAW_ADDRESS;
    address public WHITELIST_ADDRESS;

    // Buyer record
    mapping(uint16 => mapping(address => uint256)) public buyerItemsTotal; // poolId => buyer => total
    mapping(uint16 => mapping(address => uint32[])) public buyerBid; // poolId => bid index

    event PlaceOrder(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 quantity,
        uint256 totalAmount
    );

    function initialize() public initializer {
        __Ownable_init();

        // Default grant the admin role to a specified account
        admins[owner()] = true;
        // Default grant the withdraw to owner
        WITHDRAW_ADDRESS = owner();
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /**
        Modifiers
     */
    modifier onlyAdmin() {
        require(_checkadmin(), "Caller is not an admin");
        _;
    }

    function _checkadmin() private view returns (bool) {
        return admins[_msgSender()] == true;
    }

    /**
     * @dev function to place order
     */
    function placeOrder(uint16 _poolId, uint256 _quantity)
        external
        nonReentrant
        whenNotPaused
    {
        POOL_INFO memory pool = pools[_poolId];

        // require pool is open
        require(
            block.timestamp >= pool.startTime &&
                block.timestamp <= pool.endTime &&
                pool.isPublic,
            "Not Started / Expired / is not public"
        ); // The pool have not started / Expired / isPublic

        require(
            poolSaleTokenIds[_poolId].length >=
                (poolStats[_poolId].totalBidItem + _quantity) &&
                _quantity > 0,
            "Invalid quantity / sold out"
        );

        if (pool.requireWhitelist) {
            require(
                IWhitelist(WHITELIST_ADDRESS).isValid(
                    _msgSender(),
                    pool.whitelistIds
                ),
                "Caller is not in whitelist"
            );
        }

        require(pool.maxBuyPerOrder >= _quantity, "Got limited per order");

        require(
            pool.maxBuyPerAddress >=
                (buyerItemsTotal[_poolId][_msgSender()] + _quantity),
            "Got limited"
        );

        // Check balance BUSD
        uint256 totalAmount = pool.startPrice.mul(_quantity);

        IERC20Upgradeable payableToken = IERC20Upgradeable(pool.addressPayable);
        payableToken.safeTransferFrom(_msgSender(), address(this), totalAmount);

        BID_INFO memory bidding = BID_INFO({
            poolId: _poolId,
            creator: _msgSender(),
            priceEach: pool.startPrice,
            quantity: _quantity
        });
        bids[_poolId].push(bidding);

        // transfer BUSD to WITHDRAW_ADDRESS
        payableToken.safeTransfer(WITHDRAW_ADDRESS, totalAmount);

        buyerBid[_poolId][_msgSender()].push(poolStats[_poolId].totalBid);
        buyerItemsTotal[_poolId][_msgSender()] += _quantity;
        poolStats[_poolId].totalBidItem += _quantity;
        poolStats[_poolId].totalBid++;

        // Transfer NFT to user
        for (uint256 i; i < _quantity; i++) {
            uint256 idx = poolStats[_poolId].totalSold + i;
            // bidTokenIds[idx].push(poolSaleTokenIds[_poolId][idx]);

            IERC721Upgradeable nft = IERC721Upgradeable(pool.addressItem);
            nft.safeTransferFrom(
                address(this),
                _msgSender(),
                poolSaleTokenIds[_poolId][idx]
            );
        }
        poolStats[_poolId].totalSold += _quantity;

        emit PlaceOrder(_msgSender(), _poolId, _quantity, totalAmount);
    }

    /**
     * @dev function to set Admin
     */
    function setAdmin(address _addr, bool _allow) public onlyOwner {
        admins[_addr] = _allow;
    }

    /**
     * @dev function to set WITHDRAW_ADDRESS
     */
    function setWithdrawAddress(address _addr) public onlyOwner {
        WITHDRAW_ADDRESS = _addr;
    }

    /**
     * @dev function to set Whitelist Address Contract
     */
    function setWhitelistAddress(address _addr) public onlyOwner {
        WHITELIST_ADDRESS = _addr;
    }

    /**
     * @dev function to withdraw all fund
     */
    function withdrawFund(
        address _address,
        uint256 _amount,
        uint256[] memory _tokenIds
    ) external onlyOwner {
        if (_amount > 0) {
            IERC20Upgradeable token = IERC20Upgradeable(_address);

            token.safeTransfer(WITHDRAW_ADDRESS, _amount);
        } else {
            IERC721Upgradeable nft = IERC721Upgradeable(_address);

            for (uint256 i = 0; i < _tokenIds.length; i++) {
                nft.safeTransferFrom(
                    address(this),
                    WITHDRAW_ADDRESS,
                    _tokenIds[i]
                );
            }
        }
    }

    /**
        SETTER
     */
    function addOrUpdatePool(
        uint16 _poolId,
        address _addressItem,
        address _addressPayable,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist,
        uint16[] calldata _whitelistIds,
        uint256 _maxBuyPerAddress,
        uint256 _maxBuyPerOrder
    ) external onlyAdmin {
        require(_startPrice > 0, "Invalid");

        POOL_INFO storage pool = pools[_poolId]; // pool info
        require(!pool.isPublic, "Pool is public");
        // Not exist then add pool
        if (pool.startPrice == 0) {
            poolIds.push(_poolId);
        }

        // do update
        pool.addressItem = _addressItem;
        pool.addressPayable = _addressPayable;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.startPrice = _startPrice;
        pool.requireWhitelist = _requireWhitelist;
        pool.whitelistIds = _whitelistIds;

        pool.maxBuyPerAddress = _maxBuyPerAddress;
        pool.maxBuyPerOrder = _maxBuyPerOrder;

        pools[_poolId] = pool;
    }

    function updateSalePool(uint16 _poolId, uint256[] memory _saleTokenIds)
        external
        onlyAdmin
    {
        require(
            pools[_poolId].startPrice > 0 && _saleTokenIds.length > 0,
            "Invalid"
        );

        POOL_INFO memory pool = pools[_poolId]; // pool info
        require(!pool.isPublic, "Pool is public");

        poolSaleTokenIds[_poolId] = _saleTokenIds;
    }

    function handlePublicPool(uint16 _poolId, bool _isPublic)
        external
        onlyAdmin
    {
        pools[_poolId].isPublic = _isPublic;
    }

    function setPause(bool _allow) external onlyOwner {
        if (_allow) {
            _pause();
        } else {
            _unpause();
        }
    }

    /* GETTER */
    function buyerBidCount(uint16 _poolId, address _address)
        external
        view
        returns (uint256)
    {
        return buyerBid[_poolId][_address].length;
    }

    function buyerBids(uint16 _poolId, address _address)
        external
        view
        returns (uint32[] memory)
    {
        return buyerBid[_poolId][_address];
    }

    function isAdmin(address _address) external view onlyAdmin returns (bool) {
        return admins[_address];
    }

    function getSaleTokenIds(uint16 _poolId)
        external
        view
        returns (uint256[] memory)
    {
        return poolSaleTokenIds[_poolId];
    }

    function getPoolIds() external view returns (uint16[] memory) {
        return poolIds;
    }

    function getWhitelistIds(uint16 _poolId)
        external
        view
        returns (uint16[] memory)
    {
        return pools[_poolId].whitelistIds;
    }
}
