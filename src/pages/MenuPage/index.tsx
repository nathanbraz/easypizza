import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import ProductCard from '../../components/ProductCard';
import Cart from '../../components/Cart';
import ProductModal from '../../components/ProductModal';
import CheckoutModal from '../../components/CheckoutModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { api, getTenantSlugFromUrl } from '../../lib/api';
// Fallback for types or when API fails:
import { fakeProducts, fakeDrinks } from './fakeData';
import type { Product, ProductCategory } from '../../types';
import './MenuPage.css';

export default function MenuPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sessionToken = queryParams.get('t');
  
  const [customerInfo, setCustomerInfo] = useState<any | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (sessionToken) {
        try {
          const res = await api.get(`/sessions/${sessionToken}/customer-info`);
          if (res.data.success) {
            setCustomerInfo(res.data.data);
            // Salvar token globalmente para uso futuro nos headers de requisições de checkout
            localStorage.setItem('@EasyPizza:Token', sessionToken);
          }
        } catch (error) {
          console.error("Token inválido ou expirado", error);
        }
      }
    };
    fetchSession();
  }, [sessionToken]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const slug = getTenantSlugFromUrl();
        // Calls GET http://localhost:5000/api/menu/{slug}
        const response = await api.get(`/menu/${slug}`);
        setCategories(response.data);
      } catch (error) {
        console.error("Erro ao buscar cardápio, usando dados falsos...", error);
        // Fallback for UI visualization before the database has products
        // Fallback for UI visualization before the database has products
        setCategories([
          { id: 'fake-cat-1', name: 'Pizzas Tradicionais', displayOrder: 1, products: fakeProducts } as ProductCategory,
          { id: 'fake-cat-2', name: 'Bebidas', displayOrder: 2, products: fakeDrinks } as ProductCategory
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleAddToCart = (customizedItem: any) => {
    setCart([...cart, customizedItem]);
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    setIsCheckoutOpen(false);
    navigate('/tracker');
  };

  return (
    <div className="menu-page">
      {customerInfo?.lastOrderSummary && (
        <div className="reorder-banner glass-panel animate-slide-up">
          <div className="reorder-info">
            <h3>Refazer Último Pedido?</h3>
            <p>{customerInfo.lastOrderSummary}</p>
          </div>
          <button className="primary-button reorder-btn">
            Pedir Novamente
          </button>
        </div>
      )}

      <header className="header glass-panel">
        <div className="header-info">
          <h1>{customerInfo ? `Olá, ${customerInfo.customerName}!` : 'EasyPizza'}</h1>
          <div className="status-badge">
            <span className="dot"></span>
            Aberto agora
          </div>
        </div>
        <div className="header-address">
          <MapPin size={16} color="var(--primary)" />
          <span>Rua das Flores, 123 - Centro</span>
        </div>
      </header>

      <main className="menu-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>Carregando cardápio...</div>
        ) : (
          categories.map((category) => (
            <div key={category.id || category.name}>
              <h2 className="section-title">{category.name}</h2>
              <div className="product-grid">
                {category.products && category.products.map((product: Product, index: number) => (
                  <ProductCard 
                    key={product.id} 
                    product={{...product, categoryName: category.name}} 
                    onAdd={handleOpenModal} 
                    delay={index * 0.1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {cart.length > 0 && <Cart items={cart} onCheckout={() => setIsCheckoutOpen(true)} />}

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          availableProducts={categories.flatMap(c => c.products.map(p => ({...p, categoryName: c.name})))}
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={handleAddToCart}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal 
          cart={cart}
          updateCart={setCart}
          availableProducts={categories.flatMap(c => c.products.map(p => ({...p, categoryName: c.name})))}
          tenantSlug={getTenantSlugFromUrl()}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
