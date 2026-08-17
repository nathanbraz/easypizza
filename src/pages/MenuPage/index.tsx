import { useState } from 'react';
import { MapPin, MessageCircle, ListOrdered, Zap, Search, X, Home, Clock } from 'lucide-react';
import ProductCard from '../../components/ProductCard';
import Cart from '../../components/Cart';
import ProductModal from '../../components/ProductModal';
import CheckoutModal from '../../components/CheckoutModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { api, getTenantSlugFromUrl, CUSTOMER_SESSION_TOKEN_KEY } from '../../lib/api';
// Fallback para tipagem ou quando a API falhar:
import { fakeProducts, fakeDrinks } from './fakeData';
import type { Product, ProductCategory } from '../../types';
import './MenuPage.css';

export default function MenuPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any[]>(() => {
    const savedCart = localStorage.getItem('@EasyPizza:Cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sessionToken = queryParams.get('t');

  const [customerInfo, setCustomerInfo] = useState<any | null>(() => {
    const saved = localStorage.getItem('@EasyPizza:CustomerInfo');
    return saved ? JSON.parse(saved) : null;
  });
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const tokenToUse = sessionToken || localStorage.getItem(CUSTOMER_SESSION_TOKEN_KEY);
      if (tokenToUse) {
        try {
          const res = await api.get(`/sessions/${tokenToUse}/customer-info`);
          const data = res.data.data || res.data;
          if (data && (data.sessionId || data.customerName)) {
            setCustomerInfo(data);
            localStorage.setItem(CUSTOMER_SESSION_TOKEN_KEY, tokenToUse);
            localStorage.setItem('@EasyPizza:CustomerInfo', JSON.stringify(data));
            if (data.customerId) {
              localStorage.setItem('@EasyPizza:CustomerId', data.customerId);
            }
            setSessionValid(true);
            setSessionChecking(false);
            return;
          }
        } catch (error: any) {
          console.error("Token inválido ou expirado", error);
        }
      }

      // Se não tiver token ou for inválido/expirado, limpa tudo
      localStorage.removeItem(CUSTOMER_SESSION_TOKEN_KEY);
      localStorage.removeItem('@EasyPizza:CustomerInfo');
      localStorage.removeItem('@EasyPizza:CustomerId');
      setCustomerInfo(null);
      setSessionValid(false);
      setSessionChecking(false);
    };
    fetchSession();
  }, [sessionToken]);

  // Sessão pode ser invalidada em runtime (ex: expirou, ou já foi usada para concluir um pedido).
  // O interceptor do axios já limpa o token; aqui só refletimos isso na tela de "sessão expirada".
  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('@EasyPizza:CustomerInfo');
      localStorage.removeItem('@EasyPizza:CustomerId');
      setCustomerInfo(null);
      setSessionValid(false);
    };
    window.addEventListener('customer-session-expired', handleSessionExpired);
    return () => window.removeEventListener('customer-session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const slug = getTenantSlugFromUrl();
        // Chama GET http://localhost:5000/api/menu/{slug}
        const response = await api.get(`/menu/${slug}`);
        setCategories(response.data);
      } catch (error: any) {
        console.error("Erro ao buscar cardápio, usando dados falsos...", error);
        // Fallback para visualização na UI antes do banco de dados ter produtos
        setCategories([
          { id: 'fake-cat-1', name: 'Pizzas Tradicionais', displayOrder: 1, products: fakeProducts } as ProductCategory,
          { id: 'fake-cat-2', name: 'Bebidas', displayOrder: 2, products: fakeDrinks } as ProductCategory
        ]);
      } finally {
        setLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setStoreSettings(res.data.storeSettings);
      } catch (error: any) {
        console.error("Erro ao buscar configuracoes da loja", error);
      }
    };

    fetchCatalog();
    fetchSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem('@EasyPizza:Cart', JSON.stringify(cart));
  }, [cart]);

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
  };

  // Filtra por nome do produto em todas as categorias — sem rota nova, só esconde o que não bate.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleCategories = normalizedQuery
    ? categories.map(c => ({ ...c, products: (c.products || []).filter(p => p.name.toLowerCase().includes(normalizedQuery)) }))
    : categories;

  const handleAddToCart = (customizedItem: any) => {
    setCart([...cart, customizedItem]);
  };

  const handleCheckoutSuccess = (orderData?: any) => {
    setCart([]);
    setIsCheckoutOpen(false);
    if (orderData && orderData.id) {
      navigate('/tracker/' + orderData.id);
    } else {
      const lastId = localStorage.getItem('@EasyPizza:LastOrderId');
      navigate(lastId ? '/tracker/' + lastId : '/tracker');
    }
  };

  if (sessionChecking) {
    return (
      <div className="menu-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="global-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Verificando sua sessão...</p>
      </div>
    );
  }



  if (sessionValid === false) {
    const waNumber = storeSettings?.whatsAppNumber || '5511999999999';
    const waLink = `https://api.whatsapp.com/send?phone=${waNumber.replace(/\D/g, '')}&text=Ol%C3%A1!%20Gostaria%20de%20acessar%20o%20card%C3%A1pio%20e%20fazer%20um%20pedido.`;

    const handleSimulateDevSession = async () => {
      try {
        const slug = getTenantSlugFromUrl();
        const res = await api.post('/sessions/magic-link', {
          phoneNumber: '5562996753082',
          name: 'Nathan Braz'
        }, {
          headers: { 'X-Tenant-Slug': slug }
        });
        const data = res.data.data || res.data;
        if (data && data.sessionId) {
          const isSub = window.location.hostname.includes('.') && !window.location.hostname.startsWith('localhost');
          if (isSub) {
            window.location.href = `/?t=${data.sessionId}`;
          } else {
            window.location.href = `/${slug}?t=${data.sessionId}`;
          }
        }
      } catch (error) {
        console.error("Erro ao simular sessão de teste", error);
        alert("Não foi possível iniciar a sessão de teste. Verifique se o backend está rodando.");
      }
    };

    return (
      <div className="whatsapp-lock-container">
        <div className="whatsapp-lock-card">
          <div className="whatsapp-lock-icon">
            <MessageCircle size={36} color="#ffffff" />
          </div>
          <h1>Sessão Não Iniciada ou Expirada</h1>
          <p>
            Para garantir sua segurança e agilidade no atendimento, nosso cardápio é exclusivo para sessões geradas através do WhatsApp.
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            Retorne à conversa ou envie uma mensagem para receber seu link de acesso personalizado e conferir nossas novidades!
          </p>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
            <MessageCircle size={20} />
            Solicitar Acesso no WhatsApp
          </a>
          <button onClick={handleSimulateDevSession} className="dev-simulate-btn">
            <Zap size={16} />
            Simular Sessão de Teste (Ambiente Dev)
          </button>
          <div className="whatsapp-lock-footer">
            EasyPizza &bull; Atendimento Exclusivo
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-page">
      {storeSettings?.messageOfTheDay && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          {storeSettings.messageOfTheDay}
        </div>
      )}

      {storeSettings?.bannerUrl && (
        <div className="hero-banner">
          <img src={storeSettings.bannerUrl} alt="" />
          {storeSettings?.logoUrl && (
            <div className="hero-logo">
              <img src={storeSettings.logoUrl} alt="Logo" />
            </div>
          )}
        </div>
      )}

      <header className={`header glass-panel ${storeSettings?.bannerUrl ? 'header-with-banner' : ''}`}>
        <div className="header-info">
          <h1>{customerInfo ? `Olá, ${customerInfo.customerName}!` : 'EasyPizza'}</h1>
          <div className="header-actions">
            <div className="status-badge" style={{ backgroundColor: storeSettings?.isStoreOpen === false ? 'rgba(239, 68, 68, 0.1)' : undefined, color: storeSettings?.isStoreOpen === false ? '#ef4444' : undefined }}>
              <span className="dot" style={{ backgroundColor: storeSettings?.isStoreOpen === false ? '#ef4444' : undefined }}></span>
              {storeSettings?.isStoreOpen === false ? 'Fechado no momento' : 'Aberto agora'}
            </div>
            {storeSettings?.estimatedDeliveryTimeMin > 0 && (
              <div className="delivery-time-badge">
                <Clock size={14} />
                {storeSettings.estimatedDeliveryTimeMin} a {storeSettings.estimatedDeliveryTimeMax} min
              </div>
            )}
          </div>
        </div>
        <div className="header-address">
          <MapPin size={16} color="var(--primary)" />
          <span>{customerInfo?.defaultAddress ? `${customerInfo.defaultAddress.street}, ${customerInfo.defaultAddress.number} - ${customerInfo.defaultAddress.neighborhood}` : 'Rua das Flores, 123 - Centro'}</span>
        </div>
      </header>

      <main className="menu-content">
        <div className="search-bar">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Buscar produto no cardápio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} aria-label="Limpar busca">
              <X size={16} />
            </button>
          )}
        </div>

        {visibleCategories.filter(c => c.products && c.products.length > 0).length === 0 && !loading ? (
          <div className="empty-state">
            <p>{normalizedQuery ? `Nenhum produto encontrado para "${searchQuery}".` : 'Nenhum produto encontrado.'}</p>
          </div>
        ) : (
          visibleCategories.filter(category => category.products && category.products.length > 0).map((category: ProductCategory) => (
            <div key={category.id || category.name}>
              <h2 className="section-title">{category.name}</h2>
              <div className="product-grid">
                {category.products && category.products.map((product: Product, index: number) => (
                  <ProductCard
                    key={product.id}
                    product={{ ...product, categoryName: category.name, categoryId: category.id, allowsHalfAndHalf: category.allowsHalfAndHalf, addons: category.addons }}
                    onAdd={handleOpenModal}
                    delay={index * 0.1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <nav className="bottom-nav">
        <button className="bottom-nav-item active">
          <Home size={20} />
          <span>Início</span>
        </button>
        {customerInfo && (
          <button className="bottom-nav-item" onClick={() => navigate('/tracker')}>
            <ListOrdered size={20} />
            <span>Pedidos</span>
          </button>
        )}
        {customerInfo && (
          <button className="bottom-nav-item" onClick={() => navigate('/addresses')}>
            <MapPin size={20} />
            <span>Endereços</span>
          </button>
        )}
      </nav>

      {!isCheckoutOpen && !selectedProduct && cart.length > 0 && <Cart items={cart} onCheckout={() => setIsCheckoutOpen(true)} />}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          availableProducts={categories.flatMap(c => c.products.map(p => ({ ...p, categoryName: c.name, categoryId: c.id })))}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          updateCart={setCart}
          availableProducts={categories.flatMap(c => c.products.map(p => ({ ...p, categoryName: c.name })))}
          tenantSlug={getTenantSlugFromUrl()}
          storeSettings={storeSettings}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
