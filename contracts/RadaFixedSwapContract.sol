// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

interface IMintableERC721 is IERC721Upgradeable {
    function safeMint(address to, uint256 tokenId) external;
}

contract RadaFixedSwapContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // BUSD contract
    IERC20Upgradeable busdToken;

    /**
        DATA Structure
     */
    struct CAMPAIGN_INFO {
        // string title;
        address addressItem;
        bool isSaleToken; // Sale Token or NFT
        uint256 startId; // Start tokenID
        uint256 endId; // End tokenID
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice; // Start price for bidding
        bool locked; // if locked, cannot update pool / mint / open
        bool ended; // Ended to picker winners
        bool requireWhitelist;
    }

    struct BID_INFO {
        uint16 poolId;
        address creator; // Owner of bidding
        uint256 priceEach; // Price bidding for each NFT
        uint256 quantity;
        uint256 winQuantity;
    }
    mapping(uint16 => CAMPAIGN_INFO) public pools;
    mapping(uint16 => BID_INFO[]) public bids; // poolId => bids

    // other stats
    mapping(uint16 => uint32) public totalBid; // poolId => Total bid in pool
    mapping(uint16 => uint256) public totalBidItem; // poolId => Total bid Item in pool
    mapping(uint16 => uint256) public totalSold; // poolId => Sold total

    // Operation
    mapping(address => bool) public admins;
    address public WITHDRAW_ADDRESS;

    // Whitelist by pool
    mapping(uint16 => mapping(address => bool)) public whitelistAddresses; // poolId => buyer => whitelist
    mapping(uint16 => uint16) public maxBuyPerAddress; // poolId => max buy item

    // Buyer record
    mapping(uint16 => mapping(address => uint256)) public buyerItemsTotal; // poolId => buyer => total
    mapping(uint16 => mapping(address => uint32[])) public buyerBid; // poolId => bid index

    event PlaceOrder(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 quantity,
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
    function placeOrder(
        uint16 _poolId,
        uint32 _quantity,
        uint256 _priceEach
    ) external {
        CAMPAIGN_INFO memory pool = pools[_poolId];

        // require pool is open
        require(
            block.timestamp >= pool.startTime &&
                block.timestamp <= pool.endTime &&
                !pool.locked,
            "Not Started / Expired / Locked"
        ); // The pool have not started / Expired / Locked

        uint256 totalItems = pool.endId - pool.startId + 1;
        require(
            totalItems >= (totalBidItem[_poolId] + _quantity),
            "Invalid quantity / sold out"
        ); // The pool locked

        require(
            !pool.requireWhitelist || whitelistAddresses[_poolId][_msgSender()],
            "Caller is not in whitelist"
        );
        require(
            maxBuyPerAddress[_poolId] >=
                (buyerItemsTotal[_poolId][_msgSender()] + _quantity),
            "Got limited"
        );

        // Check balance BUSD
        uint256 totalAmount = _priceEach.mul(_quantity);
        require(
            _quantity > 0 &&
                _priceEach >= pool.startPrice &&
                totalAmount <= busdToken.balanceOf(_msgSender()),
            "Required valid quantity/price/balance"
        ); // Not allow quantity = 0, valid price

        uint256 allowToPayAmount = busdToken.allowance(
            _msgSender(),
            address(this)
        );
        require(allowToPayAmount >= pool.startPrice, "Invalid token allowance");

        busdToken.safeTransferFrom(_msgSender(), address(this), totalAmount);

        BID_INFO memory bidding = BID_INFO({
            poolId: _poolId,
            creator: _msgSender(),
            priceEach: _priceEach,
            quantity: _quantity,
            winQuantity: _quantity // Fixed price
        });
        bids[_poolId].push(bidding);

        // transfer BUSD to WITHDRAW_ADDRESS
        busdToken.safeTransfer(WITHDRAW_ADDRESS, totalAmount);

        buyerBid[_poolId][_msgSender()].push(totalBid[_poolId]);
        buyerItemsTotal[_poolId][_msgSender()] += _quantity;
        totalBidItem[_poolId] += _quantity;
        totalBid[_poolId]++;

        // Send Token or NFT to user
        if (pool.isSaleToken) {
            IERC20Upgradeable itemToken = IERC20Upgradeable(pool.addressItem);
            totalSold[_poolId] += bidding.winQuantity;
            itemToken.safeTransfer(_msgSender(), bidding.winQuantity);
        } else {
            uint256 tokenId;
            IMintableERC721 saleItemNft = IMintableERC721(pool.addressItem);

            for (uint8 i = 0; i < bidding.winQuantity; i++) {
                tokenId = pool.startId + totalSold[_poolId];

                totalSold[_poolId]++;
                saleItemNft.safeMint(_msgSender(), tokenId);
            }
        }

        emit PlaceOrder(_msgSender(), _poolId, _quantity, _priceEach);
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
    ) public onlyOwner {
        require(!pools[_poolId].locked, "Pool locked");
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
        // string memory _title,
        uint256 _startPrice,
        address _addressItem,
        bool _isSaleToken
    ) external onlyAdmin {
        require(pools[_poolId].startPrice == 0 && _startPrice > 0, "Invalid");

        CAMPAIGN_INFO memory pool;
        // pool.title = _title;
        pool.startPrice = _startPrice;
        pool.addressItem = _addressItem;
        pool.isSaleToken = _isSaleToken;

        pools[_poolId] = pool;
    }

    function updatePool(
        uint16 _poolId,
        address _addressItem,
        bool _isSaleToken,
        uint32 _startId,
        uint32 _endId,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist
    ) external onlyAdmin {
        require(
            pools[_poolId].startPrice > 0 && _startId > 0 && _endId > _startId,
            "Invalid"
        );

        CAMPAIGN_INFO memory pool = pools[_poolId]; // pool info
        require(!pool.locked, "Pool locked");

        // do update
        pools[_poolId].isSaleToken = _isSaleToken;
        pools[_poolId].addressItem = _addressItem;
        pools[_poolId].startId = _startId;
        pools[_poolId].endId = _endId;
        pools[_poolId].startTime = _startTime;
        pools[_poolId].endTime = _endTime;
        pools[_poolId].startPrice = _startPrice;
        pools[_poolId].requireWhitelist = _requireWhitelist;
    }

    function handleLockPool(uint16 _poolId, bool _locked) external onlyAdmin {
        pools[_poolId].locked = _locked;
    }

    function handleMaxBuy(uint16 _poolId, uint16 _maxBuyPerAddress)
        external
        onlyAdmin
    {
        maxBuyPerAddress[_poolId] = _maxBuyPerAddress;
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

    function version() public pure virtual returns (string memory) {
        return "v1";
    }
}
