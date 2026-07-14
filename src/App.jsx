import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { ethers } from "ethers";
import './App.css'


const CONTRACT_ADDRESS = ""

const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "NewTip",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "sendTip",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  },
  {
    "inputs": [],
    "name": "getContractBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTipsCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tips",
    "outputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalTips",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

function App() {

  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0");
  const [owner, setOwner] = useState("");



  async function connectWallet() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }



    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });


    setAccount(accounts[0]);
    await loadContractData();

  }


  async function getContract() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();


    return new ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );

   
  }


  async function loadContractData(){
     const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new  ethers.Contract(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      provider
    );


     const contractBalance = await contract.getContractBalance();
    const contractOwner = await contract.owner();



    setBalance(ethers.formatEther(contractBalance));
    setOwner(contractOwner);
  }



  async function sendTip() {
    if (!amount || Number(amount) <= 0) {
      alert("Input sum more than 0");
      return
    }



    const contract = await getContract();



    const tx = await contract.sendTip(message, {
      value: ethers.parseEther(amount),
    });


    await tx.wait()


    alert("Tips sended");
    setAmount("");
    setMessage("");

    await loadContractData();

  }


  async function widthdraw(){
    const contract = await getContract();
    const tx = await contract.widthdraw();
    await tx.wait();


    alert("Деньги выведены владельцем");
    await loadContractData();
  }


  return (
    <div className='container'>
      <h1>Tip Jar</h1>
      <p>Простое приложение для чаевых</p>

      {account ? (
        <div className='card'>
          <p>
            <b>Кошелек:</b> {account}
          </p>
        </div>
      ) : (
        <button onClick={connectWallet}>Подключить MetaMask</button>
      )
    }

    <div className='card'>
      <h2>Отпарвить чаевые</h2>


      <input
      type='text'
      placeholder='Message'
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      />


        <input
      type='nSUMM ETH'
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      />


      <button onClick={sendTip}>Send</button>
    </div>


    <div className='card'>
      <h2>Information</h2>

      <p>
        <b>Balance: </b> {balance} ETH
      </p>
      <p>Owner: {owner}</p> 


      <button onClick={loadContractData}>Update data</button>
    </div>



    {account && owner && account.toLowerCase() === owner.toLocaleLowerCase() &&(

      <div className='card'>
        <h2>Панель владельца</h2>
        <button onClick={widthdraw}>Вывести ETH</button>
        </div>
    )}



    </div>
    
  );
}

export default App
