// SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * THIS IS AN EXAMPLE CONTRACT WHICH USES HARDCODED VALUES FOR CLARITY.
 * PLEASE DO NOT USE THIS CODE IN PRODUCTION.
 */

/**
 * Request testnet LINK and ETH here: https://faucets.chain.link/
 * Find information on LINK Token Contracts and get the latest ETH and LINK faucets here: https://docs.chain.link/docs/link-token-contracts/
 */
 
contract RadomizeByRarity is VRFConsumerBase, Ownable {
    
    bytes32 internal keyHash;
    uint256 internal fee;

    struct Pool {
        address caller;
        uint256 total;
        uint256 count;
        uint256[] rarity;
    }
    mapping(uint256 => Pool) pools;

    mapping(uint256 => mapping(uint256 => uint256)) list;
    
    event DiceRolled(bytes32 requestId, uint256 poolId, uint256 index);
    event DiceLanded(uint256 poolId, uint256 index, uint256 indexed result);

    mapping (bytes32 => uint256[2]) requests;
    bytes32 lastRequestId;

    mapping (address => bool) public admins;
    
    /**
     * Constructor inherits VRFConsumerBase
     * 
     * Network: Kovan
     * Chainlink VRF Coordinator address: 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9
     * LINK token address:                0xa36085F69e2889c224210F603D836748e7dC0088
     * Key Hash: 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4
     */
    constructor(address _linkToken, address _vrfCoordinator, bytes32 _keyHash, uint256 _fee) 
        VRFConsumerBase(
            _vrfCoordinator, // VRF Coordinator
            _linkToken  // LINK Token
        )
    {
        keyHash = _keyHash;
        fee = _fee; // 0.1 LINK (Varies by network)
        // default admin
        admins[owner()] = true;
    }

    /*
    // for testing
    constructor() 
        VRFConsumerBase(
            0x8C7382F9D8f56b33781fE506E897a4F1e2d17255, // VRF Coordinator
            0x326C977E6efc84E512bB9C30f76E30c160eD06FB  // LINK Token
        )
    {
        keyHash = 0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4;
        fee = 100000000000000; // 0.1 LINK (Varies by network)
        // default admin
        admins[owner()] = true;
    }
    */

    // admin
    function setAdmin(address _admin) external onlyOwner {
        require(!admins[_admin], "Admin already");
        admins[_admin] = true;
    }
    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin], "Not an admin");
        admins[_admin] = false;
    }

    function addPool(address _caller, uint256 _poolId, uint256[] memory _rarity) external {
        require(admins[msg.sender], "Permission Denied");

        require (pools[_poolId].total == 0, "Pool existed");
        uint256 _total;
        for(uint256 i; i<_rarity.length; i++) _total += _rarity[i];
        // new pool
        pools[_poolId] = Pool(_caller, _total, 0, _rarity);
    }

    function getPool(uint256 _poolId) external view returns (Pool memory) {
        return pools[_poolId];
    }
    
    function setFee(uint256 _fee) external virtual {
        fee = _fee;
    }
    /** 
     * Requests randomness 
     */
    function getRandomNumber(uint256 _poolId, uint256 _index) public returns (bytes32 requestId) {
        require (pools[_poolId].caller == msg.sender, "Permission Denied");
        require (list[_poolId][_index] == 0, "Generated");
        require (_index < pools[_poolId].total, "Overflow");


        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        requestId = requestRandomness(keyHash, fee);
        requests[requestId][0] = _poolId;
        requests[requestId][1] = _index;
        // list[_poolId][_index] = pools[_poolId].rarity.length + 1; // mark as generating

        lastRequestId = requestId;

        emit DiceRolled(requestId, _poolId, _index);
    }

    function fulfillRandomnessTest(uint256 randomness) external {
        fulfillRandomness (lastRequestId, randomness);
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        // update random result into request item
        uint256 _poolId = requests[requestId][0];
        uint256 _index = requests[requestId][1];

        Pool memory _pool = pools[_poolId];
        require (list[_poolId][_index] == 0, "Generated");
        require (_pool.total > _pool.count, "Something wrong");

        // now finding unused item in pool
        uint256 _rand = randomness % (_pool.total - _pool.count) + 1;
        // find rarity
        uint256 _rarity;
        uint256 _total;
        bool isDone = false;
        while(!isDone && _rarity < _pool.rarity.length) {
            _rarity++;
            _total += _pool.rarity[_rarity-1];
            if (_total >= _rand) isDone = true;
        }

        //update pool
        pools[_poolId].rarity[_rarity] -= 1;
        list[_poolId][_index] = _rarity;
        pools[_poolId].count++;

        emit DiceLanded(_poolId, _index, _rarity);
    }

    function getResult(uint256 _poolId, uint256 _index) external view returns (uint256) {
        return list[_poolId][_index];
    }

    function withdrawLink() external {
        require(admins[msg.sender], "Permission Denied");
        require(LINK.transfer(owner(), LINK.balanceOf(address(this))), "Unable to transfer");
    }
}
