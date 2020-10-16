// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract Token is ERC20 {
    constructor (string memory name, string memory symbol, uint8 decimals) ERC20(name,symbol,decimals) public {
        _mint(msg.sender,10000000000000000000000);   
    }
}