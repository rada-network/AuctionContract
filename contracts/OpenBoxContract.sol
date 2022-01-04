// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

interface IUpdateERC721 is IERC721Upgradeable {
    struct NFT_INFO {
        bool locked; // Cannot transfer
        bool used; // Use for any purpuse
        bool isBox; // Is Box
        uint16 typeNft; // type of NFT
    }

    function burn(uint256 tokenId) external;

    function safeMint(address to, uint256 tokenId) external;

    function handleUse(uint256 _tokenId, bool _used) external;

    function setType(uint256 _tokenId, uint16 _type) external;

    function ownerOf(uint256 tokenId) external view returns (address);

    function items(uint256 tokenId) external view returns (NFT_INFO memory);
}

contract OpenBoxContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeMathUpgradeable for uint256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // NFT contract
    IUpdateERC721 itemNft;
    IERC20Upgradeable tokenBox;

    /**
        DATA Structure
     */
    struct POOL_INFO {
        string title;
        address nftAddress;
        uint256 startId; // Start tokenID
        uint256 endId; // End tokenID
        uint32 totalOpen; // Total opened in pool
        bool isSaleToken; // Sale Token or NFT
        address tokenAddress;
    }

    // Operation
    mapping(address => bool) public admins;
    mapping(uint16 => POOL_INFO) public pools;

    event OpenBox(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 indexed newTokenId
    );
    event UpdateNFT(
        address buyerAddress,
        uint16 indexed poolId,
        uint256 indexed tokenId,
        uint256 indexed typeRarity
    );

    function initialize() public initializer {
        __Ownable_init();
        // Default grant the admin role to a specified account
        admins[owner()] = true;
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
     * @dev function to Open box NFT
     */
    function openBox(uint16 _poolId, uint256 _boxesId) external {
        POOL_INFO storage pool = pools[_poolId];
        itemNft = IUpdateERC721(pool.nftAddress);

        if (pool.isSaleToken) {
            tokenBox = IERC20Upgradeable(pool.tokenAddress);
            require(
                tokenBox.balanceOf(_msgSender()) >= _boxesId,
                "Not enough Token"
            );

            // transfer box to contract
            tokenBox.safeTransferFrom(_msgSender(), address(this), _boxesId);

            // mint nfts
            for (uint256 i = 0; i < _boxesId; i++) {
                // Mint new NFT
                uint256 newTokenId = pool.startId + pool.totalOpen;
                itemNft.safeMint(_msgSender(), newTokenId);
                pool.totalOpen++;
                emit OpenBox(_msgSender(), _poolId, newTokenId);
            }
        } else {
            require(
                itemNft.ownerOf(_boxesId) == _msgSender(),
                "Caller must be owner"
            );
            require(itemNft.items(_boxesId).typeNft == 0, "Not box");
            itemNft.burn(_boxesId);
            // Mint new NFT
            uint256 newTokenId = pool.startId + pool.totalOpen;
            itemNft.safeMint(_msgSender(), newTokenId);

            pool.totalOpen++;
            emit OpenBox(_msgSender(), _poolId, newTokenId);
        }
    }

    /**
     * @dev function to Open box NFT
     */
    function updateNFT(
        uint16 _poolId, // New NFT random from Box
        uint256 _tokenId,
        uint16 _typeRarity
    ) external onlyAdmin {
        POOL_INFO memory pool = pools[_poolId];
        itemNft = IUpdateERC721(pool.nftAddress);

        itemNft.setType(_tokenId, _typeRarity);

        emit UpdateNFT(_msgSender(), _poolId, _tokenId, _typeRarity);
    }

    /**
     * @dev function to set Admin
     */
    function setAdmin(address _addr, bool _allow) public onlyOwner {
        admins[_addr] = _allow;
    }

    /**
        SETTER
     */
    // Add/update pool - by Admin
    function addPool(
        uint16 _poolId,
        string memory _title,
        address _nftAddress,
        bool _isSaleToken,
        address _tokenAddress
    ) external onlyAdmin {
        require(_nftAddress != address(0), "Invalid address");
        if (_isSaleToken) {
            require(_tokenAddress != address(0), "Invalid address Token Box");
        }
        require(pools[_poolId].nftAddress == address(0), "Pool existing");

        POOL_INFO memory pool;
        pool.nftAddress = _nftAddress;
        pool.title = _title;
        pool.isSaleToken = _isSaleToken;
        pool.tokenAddress = _tokenAddress;
        pools[_poolId] = pool;
    }

    function updatePool(
        uint16 _poolId,
        string memory _title,
        address _nftAddress,
        uint32 _startId,
        uint32 _endId,
        bool _isSaleToken,
        address _tokenAddress
    ) external onlyAdmin {
        require(_nftAddress != address(0), "Invalid address");
        if (_isSaleToken) {
            require(_tokenAddress != address(0), "Invalid address Token Box");
        }

        POOL_INFO memory pool = pools[_poolId]; // pool info
        require(pool.nftAddress != address(0), "Invalid pool");

        // do update
        pools[_poolId].title = _title;
        pools[_poolId].nftAddress = _nftAddress;
        pools[_poolId].startId = _startId;
        pools[_poolId].endId = _endId;
        pools[_poolId].isSaleToken = _isSaleToken;
        pools[_poolId].tokenAddress = _tokenAddress;
    }

    function version() public pure virtual returns (string memory) {
        return "v1";
    }
}
