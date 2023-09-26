import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation';
import Swap from './Swap';
import Deposit from './Deposit';
import Withdraw from './Withdraw';
import Charts from './Charts';
import Tabs from './Tabs';




import { loadProvider, loadNetwork, loadAccount, loadTokens, loadBalances, loadAMM } from "../store/interactions"
import { chain } from 'lodash';

function App() {

  const dispatch = useDispatch()

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = await loadProvider(dispatch)

    //Fetch current network's chainId
    const chainId = await loadNetwork(provider, dispatch)

    //Reload page when network changes
    window.ethereum.on('chainChanged', ()=>{
      window.location.reload()
    })
    
    //Fetch current account from metamask when changed
    window.ethereum.on('accountsChanged', async ()=>{
      console.log("Account Changed")
      await loadAccount(dispatch)
    })

    //Initiate Contracts
    await loadTokens(provider, chainId, dispatch)
    await loadAMM(provider, chainId, dispatch)
  }

  useEffect(() => {
    loadBlockchainData() }, []);

  return(
    <Container>
      <HashRouter>

        <Navigation />

        <hr/>

        <Tabs/>

        <Routes>
          <Route exact path="/" element ={<Swap />} />
          <Route path="/deposit" element ={<Deposit />} />
          <Route path="/withdraw" element ={<Withdraw />} />
          <Route path="/charts" element ={<Charts />} />

        </Routes>

      </HashRouter>
      
    </Container>
  )
}

export default App;
