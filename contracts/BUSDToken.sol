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

contract BUSDToken is ERC20, Ownable, ERC20Burnable {
    address public admin;
    uint256 public totalTokens;

    // wei
    constructor() ERC20("BUSD test", "BUSD") {
        totalTokens = 100 * 10**6 * 10**uint256(decimals()); // 100M
        _mint(owner(), totalTokens);
        admin = owner(); // Sets admin address in blockchain
    }
}
