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

contract RadaAuctionContract is
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
    struct POOL_INFO {
        // string title;
        address addressItem;
        bool isSaleToken; // Sale Token or NFT
        uint256 startId; // Start tokenID
        uint256 endId; // End tokenID
        uint256 startTime;
        uint256 endTime;
        uint256 startPrice; // Start price for bidding
        bool isPublic; // if isPublic, cannot update pool
        bool ended; // Ended to picker winners
        bool requireWhitelist;
        uint256 maxBuyPerAddress;
    }
    struct POOL_STATS {
        uint32 totalBid; // Total bid in pool
        uint256 totalBidItem; // Total bid ITEM in pool
        uint256 totalSold; // Sold total
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
    mapping(uint16 => POOL_STATS) public poolStats; // poolId => pool stats

    mapping(uint16 => BID_INFO[]) public bids; // poolId => bids

    // Operation
    mapping(address => bool) public admins;
    address public WITHDRAW_ADDRESS;

    // Whitelist by pool
    mapping(uint16 => mapping(address => bool)) public whitelistAddresses; // poolId => buyer => whitelist
    // Buyer record
    mapping(uint16 => mapping(address => uint32[])) public buyerBid; // poolId => bid index

    event PlaceBid(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 quantity,
        uint256 priceEach
    );
    event IncreaseBid(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 quantity,
        uint256 priceEach
    );
    event Claim(address buyerAddress, uint16 indexed poolId, uint256 bidIdx);

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
        require(_checkAdmin(), "Caller is not an admin");
        _;
    }

    function _checkAdmin() private view returns (bool) {
        return admins[_msgSender()] == true;
    }

    /**
     * @dev function to place bid, // uint256 _nonce
     */
    // 3305 bytes
    function placeBid(
        uint16 _poolId,
        uint256 _quantity,
        uint256 _priceEach
    ) external {
        POOL_INFO memory pool = pools[_poolId];

        // require pool is open
        require(
            block.timestamp >= pool.startTime &&
                block.timestamp <= pool.endTime &&
                pool.isPublic,
            "Not Started / Expired / isPublic"
        ); // The pool have not started / Expired / isPublic

        require(
            !pool.requireWhitelist || whitelistAddresses[_poolId][_msgSender()],
            "Caller is not in whitelist"
        );

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
            _quantity > 0 &&
                _priceEach >= pool.startPrice &&
                totalAmount <= busdToken.balanceOf(_msgSender()),
            "Required valid quantity/price/balance"
        ); // Not allow quantity = 0, valid price

        /* uint256 allowToPayAmount = busdToken.allowance(
            _msgSender(),
            address(this)
        );
        require(allowToPayAmount >= pool.startPrice, "Invalid token allowance"); */

        // transfer BUSD
        busdToken.safeTransferFrom(_msgSender(), address(this), totalAmount);

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
        // buyerItemsTotal[_poolId][_msgSender()] += _quantity;
        // Pool stats
        poolStats[_poolId].totalBidItem += _quantity;
        poolStats[_poolId].totalBid++;

        emit PlaceBid(_msgSender(), _poolId, _quantity, _priceEach);
    }

    /**
     * @dev function to place bid
     */
    // 1074 bytes
    function increaseBid(
        uint16 _poolId,
        uint16 _bidIndex,
        uint32 _quantity,
        uint256 _priceEach
    ) external {
        BID_INFO storage bid = bids[_poolId][_bidIndex];

        require(
            bid.quantity >= _quantity && bid.priceEach >= _priceEach,
            "Bid not valid"
        );
        require(_msgSender() == bid.creator, "Required owner");

        uint256 amountBusd = _quantity * _priceEach;
        uint256 newAmountBusd = bid.quantity * bid.priceEach;

        // transfer BUSD
        busdToken.safeTransferFrom(
            _msgSender(),
            address(this),
            amountBusd.sub(newAmountBusd)
        );

        bid.quantity = _quantity;
        bid.priceEach = _priceEach;

        emit IncreaseBid(_msgSender(), _poolId, _quantity, _priceEach);
    }

    // 1605 bytes
    function handleEndAuction(
        uint16 _poolId,
        uint32[] calldata bidsIndex,
        uint32[] calldata quantityWin
    ) external onlyAdmin {
        require(!pools[_poolId].ended, "Pool ended");

        pools[_poolId].ended = true;

        uint256 sum;
        uint256 totalItems = pools[_poolId].endId - pools[_poolId].startId + 1;

        for (uint32 i = 0; i < quantityWin.length; i++) {
            sum = sum + quantityWin[i];
        }
        require(totalItems >= sum, "Wrong quantity");
        for (uint32 i = 0; i < bidsIndex.length; i++) {
            require(
                bids[_poolId][bidsIndex[i]].quantity >= quantityWin[i],
                "Wrong quantity Bid"
            );
            bids[_poolId][bidsIndex[i]].winQuantity = quantityWin[i];
        }
    }

    /**
     * @dev function to handle claim NFT & refund pause
     */
    // 2695 bytes
    function claim(uint16 _poolId, uint256 _bidIdx) public {
        BID_INFO memory bid = bids[_poolId][_bidIdx];
        POOL_INFO memory pool = pools[_poolId];
        require(pool.ended && pool.isPublic, "Pool not end yet / isPublic");
        require(bid.creator == _msgSender(), "Invalid claim");
        require(bid.claimed == false, "Claimed");

        uint256 totalAmount = bid.priceEach.mul(bid.quantity);
        uint256 remainBusd = bid.priceEach.mul(bid.quantity - bid.winQuantity);
        uint256 soldAmount = totalAmount - remainBusd;

        // Set Claimed
        bids[_poolId][_bidIdx].claimed = true;

        if (bid.winQuantity > 0) {
            if (pool.isSaleToken) {
                IERC20Upgradeable itemToken = IERC20Upgradeable(
                    pool.addressItem
                );
                require(
                    itemToken.balanceOf(address(this)) >= bid.winQuantity,
                    "Not enough Token"
                );

                poolStats[_poolId].totalSold += bid.winQuantity;
                itemToken.safeTransfer(_msgSender(), bid.winQuantity);
            } else {
                uint256 tokenId;
                IMintableERC721 saleItemNft = IMintableERC721(pool.addressItem);

                for (uint8 i = 0; i < bid.winQuantity; i++) {
                    tokenId = pool.startId + poolStats[_poolId].totalSold;

                    poolStats[_poolId].totalSold++;
                    saleItemNft.safeMint(_msgSender(), tokenId);
                }
            }
        }
        if (remainBusd > 0) {
            busdToken.safeTransfer(bid.creator, remainBusd);
        }
        if (soldAmount > 0) {
            busdToken.safeTransfer(WITHDRAW_ADDRESS, soldAmount);
        }

        emit Claim(_msgSender(), _poolId, _bidIdx);
    }

    // 350 bytes
    function claimAll(uint16 _poolId) public {
        for (uint256 i = 0; i < buyerBid[_poolId][_msgSender()].length; i++) {
            claim(_poolId, buyerBid[_poolId][_msgSender()][i]);
        }
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
    // 657 bytes
    function setWhitelist(
        uint16 _poolId,
        address[] memory _addresses,
        bool _allow
    ) public onlyOwner {
        for (uint256 i = 0; i < _addresses.length; i++) {
            whitelistAddresses[_poolId][_addresses[i]] = _allow;
        }
    }

    /**
     * @dev function to withdraw all fund
     */
    // 621 bytes
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
     * @dev function to set Admin
     */
    function setEnd(uint16 _poolId, bool _ended) public onlyOwner {
        pools[_poolId].ended = _ended;
    }

    /**
        SETTER
     */
    // Add/update pool - by Admin
    // 844 bytes
    function addPool(
        uint16 _poolId,
        uint256 _startPrice,
        address _addressItem,
        bool _isSaleToken
    ) external onlyAdmin {
        require(pools[_poolId].startPrice == 0 && _startPrice > 0, "Invalid");

        POOL_INFO memory pool;
        pool.startPrice = _startPrice;
        pool.addressItem = _addressItem;
        pool.isSaleToken = _isSaleToken;
        pool.isPublic = true;
        pools[_poolId] = pool;
    }

    // 1219 bytes
    function updatePool(
        uint16 _poolId,
        // string memory _title,
        address _addressItem,
        bool _isSaleToken,
        uint32 _startId,
        uint32 _endId,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist,
        uint256 _maxBuyPerAddress
    ) external onlyAdmin {
        require(
            pools[_poolId].startPrice > 0 && _startId > 0 && _endId > _startId,
            "Invalid"
        );

        POOL_INFO memory pool = pools[_poolId]; // pool info
        require(!pool.isPublic, "Pool is public");

        // do update
        // pools[_poolId].title = _title;
        pools[_poolId].isSaleToken = _isSaleToken;
        pools[_poolId].addressItem = _addressItem;
        pools[_poolId].startId = _startId;
        pools[_poolId].endId = _endId;
        pools[_poolId].startTime = _startTime;
        pools[_poolId].endTime = _endTime;
        pools[_poolId].startPrice = _startPrice;
        pools[_poolId].requireWhitelist = _requireWhitelist;
        pools[_poolId].maxBuyPerAddress = _maxBuyPerAddress;
    }

    // 1307 bytes
    function handlePublicPool(uint16 _poolId, bool _isPublic)
        external
        onlyAdmin
    {
        pools[_poolId].isPublic = _isPublic;
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
