// SPDX-License-Identifier: MIT
/***********************************************
'...########:::::'###::::'########:::::'###::::
....##.... ##:::'## ##::: ##.... ##:::'## ##:::
....##:::: ##::'##:. ##:: ##:::: ##::'##:. ##::
....########::'##:::. ##: ##:::: ##:'##:::. ##:
....##.. ##::: #########: ##:::: ##: #########:
....##::. ##:: ##.... ##: ##:::: ##: ##.... ##:
....##:::. ##: ##:::: ##: ########:: ##:::: ##:
...:::::..::..:::::..::........:::..:::::..::
***********************************************/
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract BoxToken is ERC20, Ownable, ERC20Burnable {
    address public admin;
    uint256 public totalTokens;
    uint8 initialDecimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        uint8 _decimals
    ) ERC20(_name, _symbol) {
        _mint(owner(), _initialSupply);
        initialDecimals = _decimals;
        admin = owner(); // Sets admin address in blockchain
    }

    function decimals() public view virtual override returns (uint8) {
        return initialDecimals;
    }
}
