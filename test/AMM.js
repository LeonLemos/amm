const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens
const shares = ether

describe('Token', () => {
  let accounts, deployer, token1, token2, amm, liquidityProvider, investor1, investor2

  beforeEach(async () => {

    //Deploy Accounts
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    liquidityProvider = accounts[1]
    investor1 = accounts[2]
    investor2 = accounts[3]

    //Deploy Tokens
    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('Dapp University', 'DAPP', '1000000') //1 million tokens
    token2 = await Token.deploy('USD Tokens', 'USD', '1000000') //1 million tokens

    //Send Tokens
    let transaction = await token1.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    transaction = await token2.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()
    
    //Send token1 to investor1
    transaction = await token1.connect(deployer).transfer(investor1.address, tokens(100000))
    await transaction.wait()
    
    //Send token2 to investor2
    transaction = await token2.connect(deployer).transfer(investor2.address, tokens(100000))
    await transaction.wait()

    //Deploy AMM
    const AMM = await ethers.getContractFactory('AMM')
    amm = await AMM.deploy(token1.address, token2.address)
    
  })

  describe('Deployment', () => {
    
    it('has an address', async () => {
      expect (amm.address).to.not.equal(0x0)
    })

    it('Tracks token1 address', async ()=>{
        expect( await amm.token1()).to.equal(token1.address)
    })

    it('Tracks token2 address', async ()=>{
        expect( await amm.token2()).to.equal(token2.address)
    })


  })

  describe('Swapping Tokens', () => {
    let amount, transaction, result, estimate, balance

    it('Facilitates swaps', async () => {

        //Deployer approves 100k tokens
        amount = tokens(100000)
        transaction = await token1.connect(deployer).approve(amm.address, amount)
        await transaction.wait()

        transaction = await token2.connect(deployer).approve(amm.address, amount)
        await transaction.wait()

        //Deployer adds liquidity
        transaction = await amm.connect(deployer).addLiquidity(amount, amount)
        await transaction.wait()

        //Check AMM receives tokens
        expect(await token1.balanceOf(amm.address)).to.equal(amount)
        expect(await token2.balanceOf(amm.address)).to.equal(amount)

        expect(await amm.token1Balance()).to.equal(amount)
        expect(await amm.token2Balance()).to.equal(amount)

        //Check deployer has 100 shares
        expect( await amm.shares(deployer.address)).to.equal(tokens(100)) //use token helper to calculate shares

        //Cheeck pool has 100 shares
        expect (await amm.totalShares()).to.equal(tokens(100))

        //////////////////////
        //LP approves 50K tokens
        amount = tokens(50000)
        transaction = await token1.connect(liquidityProvider).approve(amm.address, amount)
        await transaction.wait()

        transaction = await token2.connect(liquidityProvider).approve(amm.address, amount)
        await transaction.wait()

        // Calculate token 2 depo amount
        let token2Deposit = await amm.calculateToken2Deposit(amount)

        //LP adds more liquidity
        transaction = await amm.connect(liquidityProvider).addLiquidity(amount,token2Deposit)
        await transaction.wait()

        //LP should have 50 sahres
        expect ( await amm.shares(liquidityProvider.address)).to.equal(tokens(50))

        //Deployer should have 100
        expect ( await amm.shares(deployer.address)).to.equal(tokens(100))

        //Pool should have 150
        expect ( await amm.totalShares()).to.equal(tokens(150))

        //////////////////////////
        //Investor1 Swap

        //Check price b4 swapping
        console.log(`Price of DAPP: ${await amm.token2Balance() / await amm.token1Balance()}\n`)
        
        //Investor1 Approves tokens
        transaction = await token1.connect(investor1).approve(amm.address,tokens(100000))
        await transaction.wait()

        //check balande b4 swap
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance b4 swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Estimate amount of tokens investor1 will rceive after swapping token1: include slippage
        estimate = await amm.calculateToken1Swap(tokens(1))
        console.log(`Token2 amount investor1 will receive after swap:${ethers.utils.formatEther(estimate)}\n`)

        //Investor1 swap token1
        transaction = await amm.connect(investor1).swapToken1(tokens(1))
        result = await transaction.wait()

        //Check swap event
        await expect(transaction).to.emit(amm,'Swap').withArgs(investor1.address,token1.address,tokens(1),token2.address, estimate, await amm.token1Balance(), await amm.token2Balance(), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp)

        //Check Investor1 balance after swap
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance After swap is, ${ethers.utils.formatEther(balance)}\n`)
        expect(estimate).to.equal(balance)

        //Check AMM token balances are in sync
        expect( await token1.balanceOf(amm.address)).to.equal( await amm.token1Balance())
        expect( await token2.balanceOf(amm.address)).to.equal( await amm.token2Balance())

        //Check price after swapping
        console.log(`Price of DAPP: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

        ////////////////////
        //Investor1 swaps again

        //Swap some more tokens to see what happens
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance b4 swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Estimate amount of tokens investor1 will rceive after swapping token1: include slippage
        estimate = await amm.calculateToken1Swap(tokens(1))
        console.log(`Token2 amount investor1 will receive after swap:${ethers.utils.formatEther(estimate)}\n`)

        //Investor1 swap token1
        transaction = await amm.connect(investor1).swapToken1(tokens(1))
        result = await transaction.wait()

        //Check Investor1 balance after swap
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance After swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Check AMM token balances are in sync
        expect( await token1.balanceOf(amm.address)).to.equal( await amm.token1Balance())
        expect( await token2.balanceOf(amm.address)).to.equal( await amm.token2Balance())

        //Check price after swapping
        console.log(`Price of DAPP: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

        ////////////////////
        //Investor1 swaps a large Amount of tokens

        //Check Balances b4 Swap
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance b4 swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Estimate amount of tokens investor1 will rceive after swapping token1: include slippage
        estimate = await amm.calculateToken1Swap(tokens(100))
        console.log(`Token2 amount investor1 will receive after swap:${ethers.utils.formatEther(estimate)}\n`)

        //Investor1 swap token1
        transaction = await amm.connect(investor1).swapToken1(tokens(100))
        result = await transaction.wait()

        //Check Investor1 balance after swap
        balance = await token2.balanceOf(investor1.address)
        console.log(`Investor1 token2 balance After swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Check AMM token balances are in sync
        expect( await token1.balanceOf(amm.address)).to.equal( await amm.token1Balance())
        expect( await token2.balanceOf(amm.address)).to.equal( await amm.token2Balance())

        //Check price after swapping
        console.log(`Price of DAPP: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

        ////////////////////////////////////////////////////////
        //Investor2 Swap

        //Check price b4 swapping
        console.log(`Price of USD: ${await amm.token1Balance() / await amm.token2Balance()}\n`)
        
        //Investor2 Approves tokens
        transaction = await token2.connect(investor2).approve(amm.address,tokens(100000))
        await transaction.wait()

        //check balande b4 swap
        balance = await token1.balanceOf(investor2.address)
        console.log(`Investor2 token1 balance b4 swap is, ${ethers.utils.formatEther(balance)}\n`)

        //Estimate amount of tokens investor2 will rceive after swapping token2: include slippage
        estimate = await amm.calculateToken2Swap(tokens(1))
        console.log(`Token1 amount investor2 will receive after swap:${ethers.utils.formatEther(estimate)}\n`)

        //Investor2 swap token2
        transaction = await amm.connect(investor2).swapToken2(tokens(1))
        result = await transaction.wait()

        //Check swap event
        await expect(transaction).to.emit(amm,'Swap').withArgs(investor2.address,token2.address,tokens(1),token1.address, estimate, await amm.token2Balance(), await amm.token1Balance(), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp)

        //Check Investor2 balance after swap
        balance = await token1.balanceOf(investor2.address)
        console.log(`Investor2 token1 balance After swap is, ${ethers.utils.formatEther(balance)}\n`)
        expect(estimate).to.equal(balance)

        //Check AMM token balances are in sync
        expect( await token1.balanceOf(amm.address)).to.equal( await amm.token1Balance())
        expect( await token2.balanceOf(amm.address)).to.equal( await amm.token2Balance())

        //Check price after swapping
        console.log(`Price of USD: ${await amm.token1Balance() / await amm.token2Balance()}\n`)
        console.log(`Price of DAPP: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        //Remove Liquidity

        console.log(`AMM token1 Balance: ${ethers.utils.formatEther(await amm.token1Balance())}\n`)
        console.log(`AMM token2 Balance: ${ethers.utils.formatEther(await amm.token2Balance())}\n`)

        //Check Liquidity Provider Balance before removing tokens
        balance = await token1.balanceOf(liquidityProvider.address)
        console.log(`Liquidity Provider token1 balance before removing funds: ${ethers.utils.formatEther(balance)}`)

        balance = await token2.balanceOf(liquidityProvider.address)
        console.log(`Liquidity Provider token2 balance before removing funds: ${ethers.utils.formatEther(balance)}`)

        //LP removes tokens
        transaction = await amm.connect(liquidityProvider).removeLiquidity(shares(50))
        await transaction.wait()

        //Check AMM token balances are in sync after 
        balance = await token1.balanceOf(liquidityProvider.address)
        console.log(`Liquidity Provider token1 balance after removing funds: ${ethers.utils.formatEther(balance)}`)

        balance = await token2.balanceOf(liquidityProvider.address)
        console.log(`Liquidity Provider token2 balance after removing funds: ${ethers.utils.formatEther(balance)}`)

        //LP should have 0 shares
        expect ( await amm.shares(liquidityProvider.address)).to.equal(0)

        //Deployer should have 0 shares
        expect ( await amm.shares(deployer.address)).to.equal(shares(100))

        //AMM pool should have 100 shares
        expect ( await amm.totalShares()).to.equal(shares(100))
    })

  })
    

})

