import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const HERO_PHOTO_SRC = "https://i.pinimg.com/736x/35/35/76/3535768639d8483978753fe301028574.jpg"; 
const LEGACY_PHOTO_SRC = "https://i.pinimg.com/736x/a7/f5/ce/a7f5ce0ec97d9f391dc439f6f5abbfd8.jpg"; 

const CONTRACT_ADDRESS = ""; 

const CONTRACT_ABI = [
  "function getAllProducts() public view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 price, address seller, bool isSold)[])",
  "function purchaseProduct(uint256 _id) public payable"
];

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Michael Jackson's White Glove",
    description: "The iconic sparkly white glove worn during the Motown 25 performance. Certified authentic.",
    imageUrl: "https://imgs.smoothradio.com/images/141027?width=1920&crop=16_9&signature=Hbk-Y2nksz9lt1GkyUBtP1fHb1A=",
    price: ethers.utils.parseEther("0.05"),
    isSold: false
  },
  {
    id: 2,
    name: "Thriller Vinyl - Original 1982",
    description: "Original gatefold pressing of the best-selling album of all time. Near Mint condition.",
    imageUrl: "https://preview.redd.it/michael-jackson-thriller-1982-hong-kong-pressing-v0-uz6aki5liqxa1.jpg?width=640&crop=smart&auto=webp&s=1d4177334d86e07332c229534c99ccbf0f2e268e", 
    price: ethers.utils.parseEther("0.02"),
    isSold: false
  },
  {
    id: 3,
    name: "Bad World Tour Fedora",
    description: "Black wool fedora hat, custom-made for the 1987-1989 World Tour. Signed by the King of Pop.",
    imageUrl: "https://www.mjworld.net/wp-content/uploads/billie-jean-bad-tour.jpg", 
    price: ethers.utils.parseEther("0.1"),
    isSold: false
  }
];

function PhotoFrame({ src, alt, className, hint }) {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }
  return (
    <div className="photo-placeholder">
      <span className="ph-icon">✦</span>
      <span className="ph-title">Место для фото</span>
      <span className="ph-hint">{hint}</span>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState("home");

  const [account, setAccount] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState(null);

  const [myPurchases, setMyPurchases] = useState([]);

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

  // Загрузка товаров из блокчейна
  const loadBlockchainData = async () => {
    if (!contract) return;
    try {
      setLoading(true);
      const data = await contract.getAllProducts();
      const formattedProducts = data.map(p => ({
        id: p.id.toNumber(),
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        price: p.price,
        isSold: p.isSold
      }));
      setProducts(formattedProducts);
      
      // Дополнительно: фильтруем купленные нами товары, если контракт возвращает адрес покупателя
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
    const targetProduct = products.find(p => p.id === id);

    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prevProducts => 
          prevProducts.map(p => p.id === id ? { ...p, isSold: true } : p)
        );
        // Добавляем купленный товар в историю покупок
        if (targetProduct) {
          setMyPurchases(prev => [...prev, { ...targetProduct, isSold: true }]);
        }
        setLoading(false);
        alert("[ДЕМО-РЕЖИМ]: Товар успешно куплен! Сделка сохранена во вкладке 'Мои покупки'.");
      }, 800);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const tx = await contract.purchaseProduct(id, { value: price });
        await tx.wait(); 
        
        // Добавляем в историю
        if (targetProduct) {
          setMyPurchases(prev => [...prev, { ...targetProduct, isSold: true }]);
        }

        alert("[WEB3-РЕЖИМ]: Транзакция подтверждена! Вы купили мерч в блокчейне!");
        loadBlockchainData(); 
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
        <div className="logo-section" onClick={() => setCurrentPage("home")} style={{ cursor: 'pointer' }}>
          <span className="logo">MJ Souvenirs</span>
          <span className="logo-sub">King of Pop Shop</span>
        </div>
        
        <nav className="nav-menu">
          <button className={`nav-link ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage("home")}>
            Главная
          </button>
          <button className={`nav-link ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => setCurrentPage("profile")}>
            Профиль
          </button>
          <button className={`nav-link ${currentPage === 'my-purchases' ? 'active' : ''}`} onClick={() => setCurrentPage("my-purchases")}>
            Мои покупки ({myPurchases.length})
          </button>
        </nav>

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

      {currentPage === "home" && (
        <section className="hero">
          <div className="hero-beam"></div>
          <div className="hero-content">
            <span className="hero-eyebrow">Официальная коллекция · сертификат в блокчейне</span>
            <h1 className="hero-title">MJ<br />SOUVENIRS</h1>
            <p className="hero-subtitle">
              Подтверждённые вещи Короля Поп-музыки. Каждый предмет — с историей
              и подлинностью, закреплённой в блокчейне.
            </p>
            <button
              className="hero-cta"
              onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Смотреть коллекцию
            </button>
          </div>
          <div className="hero-photo-frame">
            <PhotoFrame
              src={HERO_PHOTO_SRC}
              alt="Michael Jackson"
              className="hero-photo"
            />
          </div>
        </section>
      )}

      <main className="main-content">
        <div className="mode-banner">
          Текущий режим работы сайта: 
          <strong className={isDemoMode ? "demo-text" : "web3-text"}>
            {isDemoMode ? " Демо-режим (Без кошелька)" : " Web3-режим (Блокчейн активен)"}
          </strong>
        </div>

        {loading && <div className="loader">Обработка блокчейн-операции... Ждите...</div>}

        {currentPage === "home" && (
          <div id="collection">
            <div className="section-heading">
              <h2>Коллекция</h2>
              <div className="section-rule"></div>
            </div>
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="image-wrapper">
                    <img src={product.imageUrl} alt={product.name} className="product-image" />
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
                        <button className="buy-btn" onClick={() => buyProduct(product.id, product.price)}>
                          Купить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="legacy-section">
              <div className="legacy-photo-frame">
                <PhotoFrame
                  src={LEGACY_PHOTO_SRC}
                  alt="Michael Jackson"
                  className="legacy-photo"
                  hint="Вставьте фото — задайте LEGACY_PHOTO_SRC в App.jsx"
                />
              </div>
              <div className="legacy-text">
                <span className="hero-eyebrow">Наследие</span>
                <h3>Король Поп-музыки</h3>
                <p>
                  Каждая вещь в этой коллекции — часть истории артиста, изменившего
                  музыку и сцену навсегда. Мы храним подлинность и происхождение
                  каждого предмета, а блокчейн фиксирует его путь от продавца к вам.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentPage === "profile" && (
          <div className="page-card">
            <h2>Личный профиль Web3</h2>
            <div className="profile-details">
              <p><strong>Статус кошелька:</strong> {account ? "Подключен" : "Отключен"}</p>
              <p><strong>Ваш адрес:</strong> <span className="address-block">{account || "Адрес отсутствует (демо-режим)"}</span></p>
              <p><strong>Сеть взаимодействия:</strong> {isDemoMode ? "Локальный браузерный стейт" : "Injected Web3 Provider (MetaMask)"}</p>
              <p><strong>Всего куплено товаров на сайте:</strong> {myPurchases.length} шт.</p>
            </div>
          </div>
        )}

        {currentPage === "my-purchases" && (
          <div>
            <div className="section-heading">
              <h2>Ваша коллекция</h2>
              <div className="section-rule"></div>
            </div>
            {myPurchases.length === 0 ? (
              <p className="empty-message">Вы пока не приобрели ни одного сувенира. Самое время зайти на Главную!</p>
            ) : (
              <div className="product-grid">
                {myPurchases.map((product, index) => (
                  <div key={index} className="product-card purchase-card">
                    <div className="image-wrapper">
                      <img src={product.imageUrl} alt={product.name} className="product-image" />
                    </div>
                    <div className="product-info">
                      <h3 className="product-title">{product.name}</h3>
                      <div className="badge-bought">В вашей коллекции</div>
                      <p className="product-description" style={{ marginTop: '8px' }}>{product.description}</p>
                      <div className="price-container">
                        <span className="price-label">Заплачено:</span>
                        <span className="price-val">{ethers.utils.formatEther(product.price)} ETH</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} MJ Souvenirs — коллекция подлинных вещей, подтверждённая в блокчейне.
      </footer>
    </div>
  );
}

export default App;