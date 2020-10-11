pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract YCurve is ERC20 {
    constructor(uint256 amount) public ERC20("YCurve", "YCURVE", 18) {
        _mint(msg.sender, amount);
    }
}
