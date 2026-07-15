import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const CONTRACT_ADDRESS = "";

const CONTRACT_ABI = [
  "function getAllProducts() public view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 price, address seller, bool isSold)[])",
  "function purchaseProduct(uint256 _id) public payable"
];

// Демо-данные на случай, если MetaMask не подключен
const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Michael Jackson's White Glove",
    description: "The iconic sparkly white glove worn during the Motown 25 performance. Certified authentic.",
    imageUrl: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?auto=format&fit=crop&w=600&q=80",
    price: ethers.utils.parseEther("0.05"), // 0.05 ETH в wei
    isSold: false
  },
  {
    id: 2,
    name: "Thriller Vinyl - Original 1982",
    description: "Original gatefold pressing of the best-selling album of all time. Near Mint condition.",
    imageUrl: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=600&q=80", 
    price: ethers.utils.parseEther("0.02"),
    isSold: false
  },
  {
    id: 3,
    name: "Bad World Tour Fedora",
    description: "Black wool fedora hat, custom-made for the 1987-1989 World Tour. Signed by the King of Pop.",
    imageUrl: "https://images.unsplash.com/photo-1533055640609-24b498dfd74c?auto=format&fit=crop&w=600&q=80", 
    price: ethers.utils.parseEther("0.1"),
    isSold: false
  }
];

function App() {
  const [account, setAccount] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);

  // Подключение кошелька MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setIsDemoMode(false);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const marketplaceContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setContract(marketplaceContract);
        
        alert("Успешно подключено к MetaMask! Переходим в Web3 режим.");
      } catch (error) {
        console.error("Ошибка подключения к MetaMask:", error);
        alert("Не удалось подключить кошелек. Остаемся в демо-режиме.");
      } finally {
        setLoading(false);
      }
    } else {
      alert("MetaMask не найден. Вы можете пользоваться сайтом в демо-режиме!");
    }
  };

  // Загрузка товаров из блокчейна (если подключен Web3)
  const loadBlockchainData = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const data = await contract.getAllProducts();
      // Преобразуем полученные данные из контракта в удобный формат
      const formattedProducts = data.map(p => ({
        id: p.id.toNumber(),
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        price: p.price,
        isSold: p.isSold
      }));
      setProducts(formattedProducts);
    } catch (error) {
      console.error("Ошибка загрузки данных из блокчейна:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contract && !isDemoMode) {
      loadBlockchainData();
    }
  }, [contract, isDemoMode]);

  // Функция покупки 
  const buyProduct = async (id, price) => {
    if (isDemoMode) {
      // Имитация покупки в демо-режиме (без блокчейна)
      setLoading(true);
      setTimeout(() => {
        setProducts(prevProducts => 
          prevProducts.map(p => p.id === id ? { ...p, isSold: true } : p)
        );
        setLoading(false);
        alert("[ДЕМО-РЕЖИМ]: Товар успешно куплен без кошелька! Сделка зафиксирована в памяти браузера.");
      }, 800);
    } else {
      // Реальная покупка через MetaMask
      if (!contract) return;
      try {
        setLoading(true);
        const tx = await contract.purchaseProduct(id, { value: price });
        await tx.wait(); // Ждем блокчейн-подтверждения
        alert("[WEB3-РЕЖИМ]: Транзакция подтверждена! Вы купили мерч в блокчейне!");
        loadBlockchainData(); // Перезагружаем актуальные данные из смарт-контракта
      } catch (error) {
        console.error("Ошибка при покупке в Web3:", error);
        alert("Ошибка транзакции или пользователь отклонил платеж.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-section">
          <span className="logo">MJ Souvenirs</span>
          <span className="logo-sub">King of Pop Shop</span>
        </div>
        <div className="search-bar">
          <input type="text" placeholder="Я хочу купить перчатку, шляпу, винил..." />
          <button className="search-btn">Найти</button>
        </div>
        <div className="auth-section">
          {account ? (
            <div className="wallet-info">
              <span className="status-indicator online"></span>
              <span className="wallet-address">{account.slice(0, 6)}...{account.slice(-4)}</span>
            </div>
          ) : (
            <button className="connect-btn" onClick={connectWallet}>
              Войти через MetaMask
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="mode-banner">
          Текущий режим работы сайта: 
          <strong className={isDemoMode ? "demo-text" : "web3-text"}>
            {isDemoMode ? " Демо-режим (Без кошелька / Web2)" : " Web3-режим (Блокчейн активен)"}
          </strong>
        </div>

        <h2>Легендарный мерч Майкла Джексона</h2>
        
        {loading && <div className="loader">Обработка операции блокчейна... Ждите...</div>}

        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="image-wrapper">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="product-image"
                />
              </div>
              <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="purchase-section">
                  <div className="price-container">
                    <span className="price-label">Цена:</span>
                    <span className="price-val">
                      {ethers.utils.formatEther(product.price)} ETH
                    </span>
                  </div>
                  
                  {product.isSold ? (
                    <button className="buy-btn sold" disabled>Продано</button>
                  ) : (
                    <button 
                      className="buy-btn" 
                      onClick={() => buyProduct(product.id, product.price)}
                    >
                      Купить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;