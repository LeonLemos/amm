//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract AMM{

    Token public token1;
    Token public token2;

    uint256 public token1Balance;
    uint256 public token2Balance;
    uint256 public K;
    uint256 constant PRECISION = 10**18;

    event Swap( address user, address tokenGive, uint256 tokenGiveAmount, address tokenGet, uint256 tokenGetAmount, uint256 token1Balance, uint256 token2Balance, uint256 timestamp);

    uint256 public totalShares;
    mapping(address => uint256) public shares;

    

    constructor ( Token _token1, Token _token2){
        token1 = _token1;
        token2 = _token2;
    }


    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external {

        require(token1.transferFrom(msg.sender, address(this), _token1Amount),'failed to transfer token1');
        require(token2.transferFrom(msg.sender, address(this), _token2Amount),'failed to transfer token2');

        //Issue Shares
        uint256 share;

        //If 1st time adding liquid, make share 100
        if (totalShares == 0){
            share = 100*PRECISION;
        }else{
            uint256 share1 = (totalShares* _token1Amount)/token1Balance;
            uint256 share2 = (totalShares* _token2Amount)/token2Balance;
            require((share1/10**3) == (share2/10**3), "Must provide equal weight token amounts");
            share = share1;
        }

        //Manage Pool
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;
        K = token1Balance * token2Balance;

        //Updates Shares
        totalShares += share;
        shares[msg.sender] += share;
    }

    //Determine how many token2 tokens must b deposited when depositing liquidity for token1
    function calculateToken2Deposit(uint256 _token1Amount) public view returns( uint256 token2Amount){
        token2Amount = ( token2Balance * _token1Amount)/token1Balance;
    }

    //Determine how many token1 tokens must b deposited when depositing liquidity for token2
    function calculateToken1Deposit(uint256 _token2Amount) public view returns( uint256 token1Amount){
        token1Amount = ( token1Balance * _token2Amount)/token2Balance;
    }

    //Return amount of token2 received when swapping token1
    function calculateToken1Swap (uint256 _token1Amount) public view returns (uint256 token2Amount){
        //Calculate token 2 amount
        uint256 token1After = token1Balance + _token1Amount;
        uint256 token2After = K / token1After;
        token2Amount = token2Balance - token2After ;

        //Dont let pool get to 0
        if(token2Amount == token2Balance){
            token2Amount--;
        }

        require(token2Amount < token2Balance, 'swap amount too large');
    }

    function calculateToken2Swap (uint256 _token2Amount) public view returns (uint256 token1Amount){
        //Calculate token 2 amount
        uint256 token2After = token2Balance + _token2Amount;
        uint256 token1After = K / token2After;
        token1Amount = token1Balance - token1After ;

        //Dont let pool get to 0
        if(token1Amount == token1Balance){
            token1Amount--;
        }

        require(token1Amount < token1Balance, 'swap amount too large');
    }
    function swapToken1(uint256 _token1Amount)external returns (uint256 token2Amount){

        //Calculate token 2 amount
        token2Amount = calculateToken1Swap(_token1Amount);

        //Do Swap
        //1.Transfer token1 out of user wallet
        token1.transferFrom(msg.sender, address(this), _token1Amount);
        //2.Update token1 balance in contract
        token1Balance += _token1Amount;
        //3.Update token2 balance in contract
        token2Balance -= token2Amount;
        //4.Transfer token2 from contract to user wallet
        token2.transfer(msg.sender, token2Amount);

        //Emit Event
        emit Swap(msg.sender, address(token1), _token1Amount, address(token2), token2Amount, token1Balance, token2Balance, block.timestamp);
    }

    function swapToken2(uint256 _token2Amount)external returns (uint256 token1Amount){
        //Calculate token1 amount
        token1Amount = calculateToken2Swap(_token2Amount);

        //Do Swap
        //1.Transfer token2 out of user wallet
        token2.transferFrom(msg.sender, address(this), _token2Amount);
        //2.Update token2 balance in contract
        token2Balance += _token2Amount;
        //3.Update token1 balance in contract
        token1Balance -= token1Amount;
        //4.Transfer token1 from contract to user wallet
        token1.transfer(msg.sender, token1Amount);

        //Emit Event
        emit Swap(msg.sender, address(token2), _token2Amount, address(token1), token1Amount, token2Balance, token1Balance, block.timestamp);
    }  
  
    //Manage Withdrawals

    //Determine how many tokens will be withdraw
    function calculateWithdrawAmount(uint256 _share) public view returns (uint256 token1Amount, uint256 token2Amount){
        require(_share <= totalShares,"must be less than total shares");
        token1Amount = ( _share * token1Balance/ totalShares);
        token2Amount = ( _share * token2Balance/ totalShares);
    }

    //Removes Liquidity from Pool
    function removeLiquidity(uint256 _share) external returns ( uint256 token1Amount, uint256 token2Amount){
        require(_share <= shares[msg.sender],"Cannot withdraw more shares than you have");
        (token1Amount, token2Amount) = calculateWithdrawAmount(_share);

        shares[msg.sender] -= _share;
        totalShares -= _share;

        token1Balance -= token1Amount;
        token1Balance -= token2Amount;
        K = token1Balance * token2Balance;

        token1.transfer(msg.sender, token1Amount);
        token2.transfer(msg.sender, token2Amount);

        //Homework add an event

    }

}   