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

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract WhitelistContract is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    /**
        DATA Structure
     */
    // Operation
    mapping(address => bool) public admins;

    uint16[] public listIds;
    // Whitelist by list
    mapping(uint16 => mapping(address => bool)) public whitelistAddresses; // listId => address => true/false
    mapping(uint16 => string) public listTitle; // listId => title

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
        require(_checkadmin(), "Caller is not an admin");
        _;
    }

    function _checkadmin() private view returns (bool) {
        return admins[_msgSender()] == true;
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
    function addList(string calldata _title, address[] memory _addresses)
        external
        onlyAdmin
    {
        uint16 listId = uint16(listIds.length);
        listIds.push(listId);

        addOrUpdateList(listId, _title, _addresses, true);
    }

    function updateList(
        uint16 _listId,
        string calldata _title,
        address[] memory _addresses,
        bool _allow
    ) external onlyAdmin {
        require(listIds.length > _listId, "Invalid");

        addOrUpdateList(_listId, _title, _addresses, _allow);
    }

    function addOrUpdateList(
        uint16 _listId,
        string calldata _title,
        address[] memory _addresses,
        bool _allow
    ) internal {
        require(_addresses.length > 0, "Invalid");
        listTitle[_listId] = _title;

        for (uint256 i = 0; i < _addresses.length; i++) {
            whitelistAddresses[_listId][_addresses[i]] = _allow;
        }
    }

    function isValid(address _address, uint16[] calldata _listIds)
        external
        view
        returns (bool)
    {
        bool valid;
        for (uint256 i = 0; i < _listIds.length; i++) {
            if (!valid) valid = whitelistAddresses[listIds[i]][_address];
        }
        return valid;
    }

    function isAdmin(address _address) external view returns (bool) {
        return admins[_address];
    }

    function getCountList() external view returns (uint256) {
        return listIds.length;
    }
}
