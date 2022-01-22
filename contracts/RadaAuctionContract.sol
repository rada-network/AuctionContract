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

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IWhitelist.sol";

contract RadaAuctionContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
        DATA Structure
     */
    struct POOL_INFO {
        address addressItem;
        address addressPayable;
        uint256 totalItems; // Total tickets/boxes
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice; // Start price for bidding
        bool isPublic; // if isPublic, cannot update pool
        bool ended; // Ended to picker winners
        bool requireWhitelist;
        uint16[] whitelistIds;
        uint256 maxBuyPerAddress;
    }
    struct POOL_STATS {
        uint32 totalBid; // Total bid in pool
        uint256 totalBidItem; // Total bid ITEM in pool
        uint256 totalBidAmount; // Total amount bid
        uint256 totalSold; // Sold total
        uint256 totalSoldAmount; // Total amount sold
        uint256 highestPrice; // highest price
    }

    struct BID_INFO {
        address creator; // Owner of bidding
        uint256 priceEach; // Price bidding for each NFT
        uint256 quantity;
        uint256 winQuantity;
        bool claimed;
    }
    mapping(uint16 => POOL_INFO) public pools;
    uint16[] poolIds;
    mapping(uint16 => POOL_STATS) public poolStats; // poolId => pool stats
    mapping(uint16 => BID_INFO[]) public bids; // poolId => bids

    // Operation
    mapping(address => bool) admins;
    address public WITHDRAW_ADDRESS;
    address public WHITELIST_ADDRESS;

    // Whitelist by pool
    // mapping(uint16 => mapping(address => bool)) public whitelistAddresses; // poolId => buyer => whitelist
    // Buyer record
    mapping(uint16 => mapping(address => uint32[])) public buyerBid; // poolId => bid index

    event PlaceBid(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 quantity,
        uint256 priceEach
    );
    /* event IncreaseBid(
        address buyerAddress,
        uint16 indexed poolId,
        uint16 indexed bidId,
        uint256 quantity,
        uint256 priceEach
    ); */
    event ClaimAll(address buyerAddress, uint16 indexed poolId);

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
        require(_checkAdmin(), "Caller is not an admin");
        _;
    }

    function _checkAdmin() private view returns (bool) {
        return admins[_msgSender()] == true;
    }

    function _checkPoolOpen(uint16 _poolId) private view returns (bool) {
        POOL_INFO memory pool = pools[_poolId];

        return
            pool.ended == false &&
            block.timestamp >= pool.startTime &&
            block.timestamp <= pool.endTime &&
            pool.isPublic;
    }

    /**
     * @dev function to place bid, // uint256 _nonce
     */
    // 3305 bytes
    function placeBid(
        uint16 _poolId,
        uint256 _quantity,
        uint256 _priceEach
    ) external nonReentrant whenNotPaused {
        POOL_INFO memory pool = pools[_poolId];

        // require pool is open
        require(_checkPoolOpen(_poolId), "Not Started / Expired / isPublic"); // The pool have not started / Expired / isPublic

        if (pool.requireWhitelist) {
            require(
                IWhitelist(WHITELIST_ADDRESS).isValid(
                    _msgSender(),
                    pool.whitelistIds
                ),
                "Caller is not in whitelist"
            );
        }

        uint256 totalItemBought;
        for (uint256 i = 0; i < buyerBid[_poolId][_msgSender()].length; i++) {
            totalItemBought += bids[_poolId][buyerBid[_poolId][_msgSender()][i]]
                .quantity;
        }
        require(
            pool.maxBuyPerAddress >= (totalItemBought + _quantity),
            "Got limited"
        );

        // Check balance BUSD
        uint256 totalAmount = _priceEach.mul(_quantity);
        require(
            _quantity > 0 && _priceEach >= pool.startPrice,
            "Required valid quantity/price/balance"
        ); // Not allow quantity = 0, valid price

        IERC20Upgradeable payableToken = IERC20Upgradeable(pool.addressPayable);

        // transfer BUSD
        payableToken.safeTransferFrom(_msgSender(), address(this), totalAmount);
        // transfer BUSD to WITHDRAW_ADDRESS
        payableToken.safeTransfer(WITHDRAW_ADDRESS, totalAmount);

        BID_INFO memory bidding = BID_INFO({
            creator: _msgSender(),
            priceEach: _priceEach,
            quantity: _quantity,
            winQuantity: 0,
            claimed: false
        });
        bids[_poolId].push(bidding);

        // Update Stats
        if (poolStats[_poolId].highestPrice < _priceEach) {
            poolStats[_poolId].highestPrice = _priceEach;
        }
        // Buyer stats
        buyerBid[_poolId][_msgSender()].push(poolStats[_poolId].totalBid);
        // Pool stats
        poolStats[_poolId].totalBidAmount += totalAmount;
        poolStats[_poolId].totalBidItem += _quantity;
        poolStats[_poolId].totalBid++;

        emit PlaceBid(_msgSender(), _poolId, _quantity, _priceEach);
    }

    /**
     * @dev function to place bid
     */
    function increaseBid(
        uint16 _poolId,
        uint16 _bidIndex,
        uint32 _quantity,
        uint256 _priceEach
    ) external nonReentrant {
        BID_INFO storage bid = bids[_poolId][_bidIndex];

        require(
            _checkPoolOpen(_poolId) &&
                bid.claimed == false &&
                _quantity >= bid.quantity &&
                _priceEach >= bid.priceEach &&
                _msgSender() == bid.creator,
            "Pool invalid / Bid not valid"
        );

        uint256 newAmountBusd = _quantity * _priceEach;
        uint256 oldAmountBusd = bid.quantity * bid.priceEach;
        uint256 amountAdded = newAmountBusd.sub(oldAmountBusd);

        IERC20Upgradeable payableToken = IERC20Upgradeable(
            pools[_poolId].addressPayable
        );
        // transfer BUSD
        payableToken.safeTransferFrom(_msgSender(), address(this), amountAdded);
        // transfer BUSD to WITHDRAW_ADDRESS
        payableToken.safeTransfer(WITHDRAW_ADDRESS, amountAdded);

        bid.quantity = _quantity;
        bid.priceEach = _priceEach;

        // Update Stats
        if (poolStats[_poolId].highestPrice < _priceEach) {
            poolStats[_poolId].highestPrice = _priceEach;
        }
        poolStats[_poolId].totalBidItem += _quantity - bid.quantity;
        poolStats[_poolId].totalBidAmount += amountAdded;

        /* emit IncreaseBid(
            _msgSender(),
            _poolId,
            _bidIndex,
            _quantity,
            _priceEach
        ); */
    }

    function handleEndAuction(
        uint16 _poolId,
        uint32[] calldata bidsIndex,
        uint32[] calldata quantityWin
    ) external onlyAdmin {
        uint256 sum;
        for (uint32 i = 0; i < bidsIndex.length; i++) {
            require(
                bids[_poolId][bidsIndex[i]].quantity >= quantityWin[i],
                "Wrong quantity Bid"
            );
            bids[_poolId][bidsIndex[i]].winQuantity = quantityWin[i];
            sum = sum + quantityWin[i];
        }
        require(
            pools[_poolId].totalItems >= sum && !pools[_poolId].ended,
            "Wrong quantit / Pool ended"
        );

        pools[_poolId].ended = true;
    }

    /**
     * @dev function to handle claim NFT & refund pause
     */
    function claimAll(uint16 _poolId) public nonReentrant whenNotPaused {
        POOL_INFO memory pool = pools[_poolId];
        IERC20Upgradeable itemToken = IERC20Upgradeable(pool.addressItem);

        require(
            pool.ended &&
                pool.isPublic &&
                buyerBid[_poolId][_msgSender()].length > 0,
            "Invalid pool"
        ); // Pool not end yet / isPublic / Claimed

        uint256 totalRemainBusd;
        uint256 totalSoldAmount;
        for (uint256 i = 0; i < buyerBid[_poolId][_msgSender()].length; i++) {
            BID_INFO storage bid = bids[_poolId][
                buyerBid[_poolId][_msgSender()][i]
            ];
            if (bid.claimed == false) {
                (uint256 _remainBusd, uint256 _soldAmount) = getAmount(
                    _poolId,
                    buyerBid[_poolId][_msgSender()][i]
                ); // gas savings

                // Flag claimed, cannot claim again
                bid.claimed = true;

                totalRemainBusd += _remainBusd;
                totalSoldAmount += _soldAmount;
                // Set Claimable
                if (bid.winQuantity > 0) {
                    poolStats[_poolId].totalSold += bid.winQuantity;
                    itemToken.safeTransfer(_msgSender(), bid.winQuantity);
                }
            }
        }

        IERC20Upgradeable payableToken = IERC20Upgradeable(pool.addressPayable);

        if (totalRemainBusd > 0) {
            payableToken.safeTransfer(_msgSender(), totalRemainBusd);
        }
        if (totalSoldAmount > 0) {
            payableToken.safeTransfer(WITHDRAW_ADDRESS, totalSoldAmount);
        }
        poolStats[_poolId].totalSoldAmount += totalSoldAmount;

        emit ClaimAll(_msgSender(), _poolId);
    }

    function getAmount(uint16 _poolId, uint256 _bidIdx)
        internal
        view
        returns (uint256 _remainBusd, uint256 _soldAmount)
    {
        BID_INFO memory bid = bids[_poolId][_bidIdx];

        uint256 totalAmount = bid.priceEach.mul(bid.quantity);
        _remainBusd = bid.priceEach.mul(bid.quantity - bid.winQuantity);
        _soldAmount = totalAmount - _remainBusd;
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
     * @dev function to set Whitelist Address Contract
     */
    function setWhitelistAddress(address _addr) public onlyOwner {
        WHITELIST_ADDRESS = _addr;
    }

    /**
     * @dev function to withdraw ERC20
     */
    function withdrawFund(address _tokenAddress, uint256 _amount)
        external
        onlyOwner
    {
        IERC20Upgradeable token = IERC20Upgradeable(_tokenAddress);

        token.safeTransfer(WITHDRAW_ADDRESS, _amount);
    }

    /**
        SETTER
     */
    // Add/update pool - by Admin
    function addOrUpdatePool(
        uint16 _poolId,
        address _addressItem,
        address _addressPayable,
        uint256 _totalItems,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist,
        uint16[] calldata _whitelistIds,
        uint256 _maxBuyPerAddress
    ) external onlyAdmin {
        POOL_INFO storage pool = pools[_poolId]; // pool info
        require(!pool.isPublic && _startPrice > 0, "Invalid / Pool is public");
        // Not exist then add pool
        if (pool.startPrice == 0) {
            poolIds.push(_poolId);
        }

        // do update
        pool.addressItem = _addressItem;
        pool.addressPayable = _addressPayable;
        pool.totalItems = _totalItems;
        pool.startTime = _startTime;
        pool.endTime = _endTime;
        pool.startPrice = _startPrice;
        pool.requireWhitelist = _requireWhitelist;
        pool.whitelistIds = _whitelistIds;
        pool.maxBuyPerAddress = _maxBuyPerAddress;

        pools[_poolId] = pool;
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

    function getPoolIds() external view returns (uint16[] memory) {
        return poolIds;
    }

    function isAdmin(address _address) external view onlyAdmin returns (bool) {
        return admins[_address];
    }

    function getWhitelistIds(uint16 _poolId)
        external
        view
        returns (uint16[] memory)
    {
        return pools[_poolId].whitelistIds;
    }
}
