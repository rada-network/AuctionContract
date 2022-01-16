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

    // BUSD contract
    IERC20Upgradeable busdToken;

    /**
        DATA Structure
     */
    struct POOL_INFO {
        address addressItem;
        uint256[] saleTokenIds; // tokenId array for sale
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice; // initialPrice
        bool isPublic; // if isPublic, cannot update pool
        bool ended; // Ended to picker winners
        bool requireWhitelist;
        uint256 maxBuyPerAddress;
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
        uint256[] tokenIds;
    }
    mapping(uint16 => POOL_INFO) public pools;
    uint16[] public poolIds;

    mapping(uint16 => POOL_STATS) public poolStats; // poolId => pool stats
    mapping(uint16 => BID_INFO[]) public bids; // poolId => bids

    // Operation
    mapping(address => bool) admins;
    address public WITHDRAW_ADDRESS;

    // Whitelist by pool
    mapping(uint16 => mapping(address => bool)) public whitelistAddresses; // poolId => buyer => whitelist

    // Buyer record
    mapping(uint16 => mapping(address => uint256)) public buyerItemsTotal; // poolId => buyer => total
    mapping(uint16 => mapping(address => uint32[])) public buyerBid; // poolId => bid index

    event PlaceOrder(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 _quantity,
        uint256 priceEach
    );

    function initialize(address _busdAddress) public initializer {
        __Ownable_init();

        busdToken = IERC20Upgradeable(_busdAddress);

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
            pool.saleTokenIds.length >=
                (poolStats[_poolId].totalBidItem + _quantity) &&
                _quantity > 0,
            "Invalid quantity / sold out"
        );

        require(
            !pool.requireWhitelist || whitelistAddresses[_poolId][_msgSender()],
            "Caller is not in whitelist"
        );
        require(
            pool.maxBuyPerAddress >=
                (buyerItemsTotal[_poolId][_msgSender()] + _quantity),
            "Got limited"
        );

        // Check balance BUSD
        uint256 totalAmount = pool.startPrice.mul(_quantity);
        busdToken.safeTransferFrom(_msgSender(), address(this), totalAmount);

        uint256[] memory _tokenIds = new uint256[](_quantity);
        for (uint256 i; i < _quantity; i++) {
            _tokenIds[i] = pool.saleTokenIds[poolStats[_poolId].totalSold];
            poolStats[_poolId].totalSold++;
        }
        BID_INFO memory bidding = BID_INFO({
            poolId: _poolId,
            creator: _msgSender(),
            priceEach: pool.startPrice,
            tokenIds: _tokenIds
        });
        bids[_poolId].push(bidding);

        // transfer BUSD to WITHDRAW_ADDRESS
        busdToken.safeTransfer(WITHDRAW_ADDRESS, totalAmount);

        buyerBid[_poolId][_msgSender()].push(poolStats[_poolId].totalBid);
        buyerItemsTotal[_poolId][_msgSender()] += _quantity;
        poolStats[_poolId].totalBidItem += _quantity;
        poolStats[_poolId].totalBid++;

        // Transfer NFT to user
        for (uint256 i; i < _quantity; i++) {
            IERC721Upgradeable nft = IERC721Upgradeable(pool.addressItem);
            nft.safeTransferFrom(address(this), _msgSender(), _tokenIds[i]);
        }

        emit PlaceOrder(_msgSender(), _poolId, _quantity, pool.startPrice);
    }

    /**
     * @dev function to set Admin
     */
    function setAdmin(address _addr, bool _allow) public onlyOwner {
        admins[_addr] = _allow;
    }

    /**
     * @dev function to set Admin
     */
    function setWithdrawAddress(address _addr) public onlyOwner {
        WITHDRAW_ADDRESS = _addr;
    }

    /**
     * @dev function to set white list address
     */
    function setWhitelist(
        uint16 _poolId,
        address[] memory _addresses,
        bool _allow
    ) public onlyAdmin {
        for (uint256 i = 0; i < _addresses.length; i++) {
            whitelistAddresses[_poolId][_addresses[i]] = _allow;
        }
    }

    /**
     * @dev function to withdraw all fund
     */
    function withdrawFund(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);
        require(
            token.balanceOf(address(this)) >= _amount &&
                WITHDRAW_ADDRESS != address(0),
            "Invalid"
        );

        token.safeTransfer(WITHDRAW_ADDRESS, _amount);
    }

    /**
        SETTER
     */
    // Add/update pool - by Admin
    function addPool(
        uint16 _poolId,
        uint256 _startPrice,
        address _addressItem
    ) external onlyAdmin {
        require(pools[_poolId].startPrice == 0 && _startPrice > 0, "Invalid");

        POOL_INFO memory pool;
        pool.startPrice = _startPrice;
        pool.addressItem = _addressItem;
        pool.isPublic = false;
        pools[_poolId] = pool;

        poolIds.push(_poolId);
    }

    function updatePool(
        uint16 _poolId,
        address _addressItem,
        uint256[] memory _saleTokenIds,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist,
        uint256 _maxBuyPerAddress
    ) external onlyAdmin {
        require(
            pools[_poolId].startPrice > 0 && _saleTokenIds.length > 0,
            "Invalid"
        );

        POOL_INFO memory pool = pools[_poolId]; // pool info
        require(!pool.isPublic, "Pool is public");

        // do update
        pools[_poolId].addressItem = _addressItem;
        pools[_poolId].saleTokenIds = _saleTokenIds;
        pools[_poolId].startTime = _startTime;
        pools[_poolId].endTime = _endTime;
        pools[_poolId].startPrice = _startPrice;
        pools[_poolId].requireWhitelist = _requireWhitelist;
        pools[_poolId].maxBuyPerAddress = _maxBuyPerAddress;
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

    function getPoolIds() public view returns (uint16[] memory) {
        return poolIds;
    }

    function isAdmin(address _address) external view onlyAdmin returns (bool) {
        return admins[_address];
    }
}
