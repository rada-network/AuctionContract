// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IWhitelist {
    function isValid(address addr, uint16[] calldata listIds)
        external
        view
        returns (bool);
}
