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

    // wei
    constructor() ERC20("Box RADA", "BoxRADA") {
        totalTokens = 100_000; // 100.000 Box
        _mint(owner(), totalTokens);
        admin = owner(); // Sets admin address in blockchain
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }
}
