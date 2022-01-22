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
import "./interfaces/IWhitelist.sol";

contract NFTAuctionContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
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
    mapping(uint16 => uint256[]) public poolSaleTokenIds; // poolId => List tokenId for sale

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
        uint256 totalAmount
    );
    /* event IncreaseBid(
        address buyerAddress,
        uint16 indexed poolId,
        uint16 indexed bidId,
        uint256 quantity,
        uint256 totalAmount
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
        _checkAdmin();
        _;
    }

    function _checkAdmin() private view {
        require(admins[_msgSender()] == true, "Caller is not an admin");
    }

    function _checkPoolOpen(POOL_INFO memory pool) private view {
        require(
            pool.ended == false &&
                block.timestamp >= pool.startTime &&
                block.timestamp <= pool.endTime &&
                pool.isPublic,
            "Not Started / Expired / isPublic"
        ); // The pool have not started / Expired / isPublic
    }

    /**
     * @dev function to place bid
     */
    function placeBid(
        uint16 _poolId,
        uint256 _quantity,
        uint256 _priceEach
    ) external nonReentrant {
        POOL_INFO memory pool = pools[_poolId];

        // require pool is open
        _checkPoolOpen(pool);

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
        uint256 totalAmount = _priceEach.mul(_quantity);
        require(
            pool.maxBuyPerAddress >= (totalItemBought + _quantity) &&
                _quantity > 0 &&
                _priceEach >= pool.startPrice,
            "Required valid limit/quantity/price/balance"
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

        emit PlaceBid(_msgSender(), _poolId, _quantity, totalAmount);
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
        // require pool is open
        _checkPoolOpen(pools[_poolId]);
        BID_INFO storage bid = bids[_poolId][_bidIndex];

        require(
            bid.claimed == false &&
                _quantity >= bid.quantity &&
                _priceEach >= bid.priceEach &&
                _msgSender() == bid.creator,
            "Bid not valid"
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
            newAmountBusd
        ); */
    }

    function handleEndAuction(
        uint16 _poolId,
        uint32[] calldata bidsIndex,
        uint32[] calldata quantityWin
    ) external onlyAdmin {
        /* uint256 sum;
        for (uint32 i = 0; i < quantityWin.length; i++) {
            sum = sum + quantityWin[i];
        }
        require(poolSaleTokenIds[_poolId].length >= sum, "Wrong quantity"); */

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
            poolSaleTokenIds[_poolId].length >= sum && !pools[_poolId].ended,
            "Wrong quantity / Pool ended"
        );
        pools[_poolId].ended = true;
    }

    /**
     * @dev function to handle claim NFT & refund pause
     */
    function claimAll(uint16 _poolId) public nonReentrant {
        POOL_INFO memory pool = pools[_poolId];
        IERC721Upgradeable nft = IERC721Upgradeable(pool.addressItem);

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
                (uint256 _remainBusd, uint256 _soldAmount) = getAmount(bid); // gas savings

                // Flag claimed, cannot claim again
                bid.claimed = true;

                totalRemainBusd += _remainBusd;
                totalSoldAmount += _soldAmount;
                // Set Claimable
                if (bid.winQuantity > 0) {
                    // Transfer NFT to user
                    for (uint256 j; j < bid.winQuantity; j++) {
                        uint256 tokenId = poolSaleTokenIds[_poolId][
                            poolStats[_poolId].totalSold + j
                        ];

                        nft.safeTransferFrom(
                            address(this),
                            _msgSender(),
                            tokenId
                        );
                    }
                    poolStats[_poolId].totalSold += bid.winQuantity;
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

    function getAmount(BID_INFO memory bid)
        internal
        pure
        returns (uint256 _remainBusd, uint256 _soldAmount)
    {
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
     * @dev function to set Withdraw Address
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
    function withdrawFund(
        address _address,
        uint256 _amount,
        uint256[] memory _tokenIds
    ) external onlyOwner {
        if (_amount > 0) {
            IERC20Upgradeable payableToken = IERC20Upgradeable(_address);

            payableToken.safeTransfer(WITHDRAW_ADDRESS, _amount);
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
    // Add/update pool - by Admin
    function addOrUpdatePool(
        uint16 _poolId,
        address _addressItem,
        address _addressPayable,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startPrice,
        bool _requireWhitelist,
        uint16[] calldata _whitelistIds,
        uint256 _maxBuyPerAddress
    ) external onlyAdmin {
        POOL_INFO storage pool = pools[_poolId]; // pool info
        require(_startPrice > 0 && !pool.isPublic, "Invalid / Pool is public");

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
        pool.maxBuyPerAddress = _maxBuyPerAddress;
        pool.whitelistIds = _whitelistIds;
    }

    function updateSalePool(uint16 _poolId, uint256[] memory _saleTokenIds)
        external
        onlyAdmin
    {
        POOL_INFO memory pool = pools[_poolId]; // pool info
        // require(!pool.isPublic && _saleTokenIds.length > 0, "Invalid");
        if (!pool.isPublic) {
            poolSaleTokenIds[_poolId] = _saleTokenIds;
        }
    }

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
