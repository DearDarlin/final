import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';

const HERO_PHOTO_SRC = "https://i.pinimg.com/736x/35/35/76/3535768639d8483978753fe301028574.jpg";
const LEGACY_PHOTO_SRC = "https://i.pinimg.com/736x/a7/f5/ce/a7f5ce0ec97d9f391dc439f6f5abbfd8.jpg";

const HEE_HEE_SRC = "/sounds/hee-hee.mp3";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

const CONTRACT_ABI = [
  "function owner() public view returns (address)",
  "function getAllProducts() public view returns (tuple(uint256 id, string name, string description, string imageUrl, uint256 price, address seller, address buyer, uint8 status, bytes32 shippingAddressHash)[])",
  "function createProduct(string _name, string _description, string _imageUrl, uint256 _price) public",
  "function purchaseProduct(uint256 _id, bytes32 _shippingAddressHash) public payable",
  "function markAsShipped(uint256 _id) public",
  "function confirmDelivery(uint256 _id) public",
  "function cancelOrder(uint256 _id) public"
];

// Статусы заказа
const ORDER_STATUS = {
  LISTED: 0,
  PAID: 1,
  SHIPPED: 2,
  COMPLETED: 3,
  CANCELLED: 4
};

const STATUS_LABELS = {
  [ORDER_STATUS.LISTED]: { text: "В продаже", className: "status-listed" },
  [ORDER_STATUS.PAID]: { text: "Оплачено · ждёт отправки", className: "status-paid" },
  [ORDER_STATUS.SHIPPED]: { text: "Отправлено", className: "status-shipped" },
  [ORDER_STATUS.COMPLETED]: { text: "Доставлено", className: "status-completed" },
  [ORDER_STATUS.CANCELLED]: { text: "Отменено", className: "status-cancelled" }
};

// Адрес доставки в демо-режиме и как заглушка для Web3-режима храним его в localStorage,
const ADDRESS_STORE_KEY = "mj_shipping_addresses";

function loadShippingAddresses() {
  try {
    return JSON.parse(localStorage.getItem(ADDRESS_STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveShippingAddress(productId, address) {
  const all = loadShippingAddresses();
  all[productId] = address;
  localStorage.setItem(ADDRESS_STORE_KEY, JSON.stringify(all));
}

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Michael Jackson's White Glove",
    description: "The iconic sparkly white glove worn during the Motown 25 performance. Certified authentic.",
    imageUrl: "https://imgs.smoothradio.com/images/141027?width=1920&crop=16_9&signature=Hbk-Y2nksz9lt1GkyUBtP1fHb1A=",
    price: ethers.utils.parseEther("0.05"),
    seller: "0xDemoSeller000000000000000000000000001",
    buyer: null,
    status: ORDER_STATUS.LISTED
  },
  {
    id: 2,
    name: "Thriller Vinyl - Original 1982",
    description: "Original gatefold pressing of the best-selling album of all time. Near Mint condition.",
    imageUrl: "https://preview.redd.it/michael-jackson-thriller-1982-hong-kong-pressing-v0-uz6aki5liqxa1.jpg?width=640&crop=smart&auto=webp&s=1d4177334d86e07332c229534c99ccbf0f2e268e",
    price: ethers.utils.parseEther("0.02"),
    seller: "0xDemoSeller000000000000000000000000001",
    buyer: null,
    status: ORDER_STATUS.LISTED
  },
  {
    id: 3,
    name: "Bad World Tour Fedora",
    description: "Black wool fedora hat, custom-made for the 1987-1989 World Tour. Signed by the King of Pop.",
    imageUrl: "https://www.mjworld.net/wp-content/uploads/billie-jean-bad-tour.jpg",
    price: ethers.utils.parseEther("0.1"),
    seller: "0xDemoSeller000000000000000000000000001",
    buyer: null,
    status: ORDER_STATUS.LISTED
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

// Модалка запроса адреса доставки перед покупкой
function ShippingModal({ product, onConfirm, onCancel }) {
  const [address, setAddress] = useState("");

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Адрес доставки</h3>
        <p className="modal-hint">
          Укажите, куда отправить «{product.name}». Адрес не публикуется в
          блокчейне — он виден только продавцу.
        </p>
        <textarea
          className="address-input"
          rows={3}
          placeholder="Страна, город, улица, дом, индекс, ФИО получателя"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="modal-actions">
          <button className="modal-btn ghost" onClick={onCancel}>Отмена</button>
          <button
            className="modal-btn"
            disabled={address.trim().length < 5}
            onClick={() => onConfirm(address.trim())}
          >
            Оплатить и подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

// Форма добавления товара — видна только владельцу контракта
function AdminProductForm({ onCreate, loading }) {
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", price: "" });

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = () => {
    if (!form.name || !form.price) return;
    onCreate(form);
    setForm({ name: "", description: "", imageUrl: "", price: "" });
  };

  return (
    <div className="admin-form">
      <div className="admin-form-grid">
        <input placeholder="Название товара" value={form.name} onChange={update("name")} />
        <input placeholder="Цена, ETH (например 0.03)" value={form.price} onChange={update("price")} />
        <input placeholder="Ссылка на изображение" value={form.imageUrl} onChange={update("imageUrl")} className="admin-form-full" />
        <textarea placeholder="Описание" value={form.description} onChange={update("description")} className="admin-form-full" rows={2} />
      </div>
      <button className="hero-cta" disabled={loading} onClick={submit}>
        {loading ? "Добавление..." : "Добавить товар"}
      </button>
    </div>
  );
}

// Стек уведомлений вместо системного alert() 
function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => onDismiss(t.id)}>
          <span className="toast-icon">{t.type === "error" ? "✕" : "✦"}</span>
          <span className="toast-text">{t.message}</span>
        </div>
      ))}
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
  const [ownerAddress, setOwnerAddress] = useState("0xDemoSeller000000000000000000000000001");

  const [pendingPurchase, setPendingPurchase] = useState(null); // товар, ожидающий адреса доставки
  const [shippingAddresses, setShippingAddresses] = useState(loadShippingAddresses());

  const isOwner = account && ownerAddress && account.toLowerCase() === ownerAddress.toLowerCase();

  // ===== Звук "hee hee" =====
  const heeHeeRef = useRef(null);
  const playHeeHee = useCallback((volume = 0.5) => {
    try {
      if (!heeHeeRef.current) {
        heeHeeRef.current = new Audio(HEE_HEE_SRC);
      }
      heeHeeRef.current.volume = volume;
      heeHeeRef.current.currentTime = 0;
      // play() возвращает Promise — если браузер заблокирует автозапуск
      heeHeeRef.current.play().catch(() => {});
    } catch (e) {
    }
  }, []);

  // ===== Тосты вместо alert() =====
  const [toasts, setToasts] = useState([]);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const showToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    playHeeHee(0.55);
    setTimeout(() => dismissToast(id), 4500);
  }, [playHeeHee, dismissToast]);

  // Подключение кошелька MetaMask
  const connectWallet = async () => {
    playHeeHee(0.35);
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

        const chainOwner = await marketplaceContract.owner();
        setOwnerAddress(chainOwner);

        showToast("Успешно подключено к MetaMask! Переходим в Web3 режим.", "success");
      } catch (error) {
        console.error("Ошибка подключения к MetaMask:", error);
        showToast("Не удалось подключить кошелек. Остаемся в демо-режиме.", "error");
      } finally {
        setLoading(false);
      }
    } else {
      showToast("MetaMask не найден. Вы можете пользоваться сайтом в демо-режиме!", "info");
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
        seller: p.seller,
        buyer: p.buyer,
        status: p.status
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

  // Покупатель нажал "Купить" — сперва спрашиваем адрес доставки
  const startPurchase = (product) => {
    playHeeHee(0.4);
    if (isOwner) {
      showToast("Продавец не может купить собственный товар.", "error");
      return;
    }
    setPendingPurchase(product);
  };

  // Покупка после подтверждения адреса
  const confirmPurchase = async (address) => {
    playHeeHee(0.4);
    const product = pendingPurchase;
    setPendingPurchase(null);
    if (!product) return;

    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prev =>
          prev.map(p => p.id === product.id
            ? { ...p, status: ORDER_STATUS.PAID, buyer: account || "demo-buyer" }
            : p)
        );
        saveShippingAddress(product.id, address);
        setShippingAddresses(loadShippingAddresses());
        setLoading(false);
        showToast("[ДЕМО-РЕЖИМ]: Оплата прошла. Деньги в эскроу до подтверждения доставки.", "success");
      }, 800);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const addressHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(address));
        const tx = await contract.purchaseProduct(product.id, addressHash, { value: product.price });
        await tx.wait();

        saveShippingAddress(product.id, address);
        setShippingAddresses(loadShippingAddresses());

        showToast("[WEB3-РЕЖИМ]: Оплата подтверждена в блокчейне! Деньги в эскроу.", "success");
        loadBlockchainData();
      } catch (error) {
        console.error("Ошибка при покупке в Web3:", error);
        showToast("Ошибка транзакции или пользователь отклонил платеж.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Продавец отмечает отправку
  const markAsShipped = async (product) => {
    playHeeHee(0.4);
    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: ORDER_STATUS.SHIPPED } : p));
        setLoading(false);
      }, 500);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const tx = await contract.markAsShipped(product.id);
        await tx.wait();
        showToast("Посылка отмечена как отправленная.", "success");
        loadBlockchainData();
      } catch (error) {
        console.error("Ошибка markAsShipped:", error);
        showToast("Не удалось обновить статус отправки.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Покупатель подтверждает получение — деньги уходят продавцу
  const confirmDelivery = async (product) => {
    playHeeHee(0.4);
    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: ORDER_STATUS.COMPLETED } : p));
        setLoading(false);
        showToast("[ДЕМО-РЕЖИМ]: Получение подтверждено, деньги переведены продавцу.", "success");
      }, 500);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const tx = await contract.confirmDelivery(product.id);
        await tx.wait();
        showToast("Получение подтверждено! Средства переведены продавцу.", "success");
        loadBlockchainData();
      } catch (error) {
        console.error("Ошибка confirmDelivery:", error);
        showToast("Не удалось подтвердить получение.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Покупатель отменяет заказ (пока не отправлен)
  const cancelOrder = async (product) => {
    if (!window.confirm("Отменить заказ и вернуть деньги?")) return;
    playHeeHee(0.4);

    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prev => prev.map(p => p.id === product.id
          ? { ...p, status: ORDER_STATUS.LISTED, buyer: null }
          : p));
        setLoading(false);
        showToast("[ДЕМО-РЕЖИМ]: Заказ отменён, средства возвращены.", "info");
      }, 500);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const tx = await contract.cancelOrder(product.id);
        await tx.wait();
        showToast("Заказ отменён, средства возвращены на ваш кошелёк.", "info");
        loadBlockchainData();
      } catch (error) {
        console.error("Ошибка cancelOrder:", error);
        showToast("Не удалось отменить заказ (возможно, он уже отправлен).", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Владелец добавляет новый товар
  const createProduct = async (form) => {
    playHeeHee(0.4);
    if (isDemoMode) {
      setLoading(true);
      setTimeout(() => {
        setProducts(prev => [
          ...prev,
          {
            id: prev.length ? Math.max(...prev.map(p => p.id)) + 1 : 1,
            name: form.name,
            description: form.description,
            imageUrl: form.imageUrl,
            price: ethers.utils.parseEther(form.price || "0"),
            seller: ownerAddress,
            buyer: null,
            status: ORDER_STATUS.LISTED
          }
        ]);
        setLoading(false);
      }, 500);
    } else {
      if (!contract) return;
      try {
        setLoading(true);
        const priceWei = ethers.utils.parseEther(form.price);
        const tx = await contract.createProduct(form.name, form.description, form.imageUrl, priceWei);
        await tx.wait();
        showToast("Товар добавлен в каталог!", "success");
        loadBlockchainData();
      } catch (error) {
        console.error("Ошибка createProduct:", error);
        showToast("Не удалось добавить товар (только владелец контракта может это делать).", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const myPurchases = products.filter(p =>
    account && p.buyer && p.buyer.toLowerCase?.() === account.toLowerCase() && p.status !== ORDER_STATUS.LISTED
  ).concat(
    isDemoMode ? products.filter(p => p.buyer === "demo-buyer" && p.status !== ORDER_STATUS.LISTED) : []
  );

  const renderStatusBadge = (status) => {
    const label = STATUS_LABELS[status] || STATUS_LABELS[ORDER_STATUS.LISTED];
    return <span className={`status-badge ${label.className}`}>{label.text}</span>;
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
          {isOwner && (
            <button className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`} onClick={() => setCurrentPage("admin")}>
              Управление заказами
            </button>
          )}
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
              и подлинностью, закреплённой в блокчейне. Деньги хранятся в эскроу
              до подтверждения доставки.
            </p>
            <button
              className="hero-cta"
              onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Смотреть коллекцию
            </button>
          </div>
          <div className="hero-photo-frame">
            <PhotoFrame src={HERO_PHOTO_SRC} alt="Michael Jackson" className="hero-photo" />
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
              {products.filter(p => p.status === ORDER_STATUS.LISTED).map((product) => (
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
                        <span className="price-val">{ethers.utils.formatEther(product.price)} ETH</span>
                      </div>
                      <button className="buy-btn" onClick={() => startPurchase(product)}>
                        Купить
                      </button>
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
              <p><strong>Роль:</strong> {isOwner ? "Владелец магазина" : "Покупатель"}</p>
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
                {myPurchases.map((product) => (
                  <div key={product.id} className="product-card purchase-card">
                    <div className="image-wrapper">
                      <img src={product.imageUrl} alt={product.name} className="product-image" />
                    </div>
                    <div className="product-info">
                      <h3 className="product-title">{product.name}</h3>
                      {renderStatusBadge(product.status)}
                      <p className="product-description" style={{ marginTop: '8px' }}>{product.description}</p>
                      <p className="shipping-address-note">
                        Адрес доставки: {shippingAddresses[product.id] || "не указан"}
                      </p>
                      <div className="price-container">
                        <span className="price-label">Заплачено:</span>
                        <span className="price-val">{ethers.utils.formatEther(product.price)} ETH</span>
                      </div>

                      <div className="order-actions">
                        {product.status === ORDER_STATUS.PAID && (
                          <button className="modal-btn ghost small" onClick={() => cancelOrder(product)}>
                            Отменить заказ
                          </button>
                        )}
                        {product.status === ORDER_STATUS.SHIPPED && (
                          <button className="modal-btn small" onClick={() => confirmDelivery(product)}>
                            Подтвердить получение
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentPage === "admin" && isOwner && (
          <div>
            <div className="section-heading">
              <h2>Управление заказами</h2>
              <div className="section-rule"></div>
            </div>

            <div className="section-heading" style={{ marginTop: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-muted)', margin: 0 }}>
                Добавить новый товар
              </h3>
            </div>
            <AdminProductForm onCreate={createProduct} loading={loading} />

            <div className="section-heading" style={{ marginTop: 40 }}>
              <h3 style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--ink-muted)', margin: 0 }}>
                Заказы, ожидающие отправки
              </h3>
            </div>
            <div className="product-grid">
              {products.filter(p => p.status === ORDER_STATUS.PAID).map(product => (
                <div key={product.id} className="product-card purchase-card">
                  <div className="image-wrapper">
                    <img src={product.imageUrl} alt={product.name} className="product-image" />
                  </div>
                  <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    {renderStatusBadge(product.status)}
                    <p className="shipping-address-note">
                      Куда отправлять: {shippingAddresses[product.id] || "не указан"}
                    </p>
                    <button className="modal-btn small" onClick={() => markAsShipped(product)}>
                      Отметить как отправлено
                    </button>
                  </div>
                </div>
              ))}
              {products.filter(p => p.status === ORDER_STATUS.PAID).length === 0 && (
                <p className="empty-message">Нет заказов, ожидающих отправки.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {pendingPurchase && (
        <ShippingModal
          product={pendingPurchase}
          onConfirm={confirmPurchase}
          onCancel={() => setPendingPurchase(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <footer className="footer">
        © {new Date().getFullYear()} MJ Souvenirs — коллекция подлинных вещей, подтверждённая в блокчейне.
      </footer>
    </div>
  );
}

export default App;