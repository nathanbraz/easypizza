import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import ProductCard from '../../components/ProductCard';
import Cart from '../../components/Cart';
import ProductModal from '../../components/ProductModal';
import { useEffect } from 'react';
import { api, getTenantSlugFromUrl } from '../../lib/api';
// Fallback for types or when API fails:
import { fakeProducts } from './fakeData';
import type { Product } from './fakeData';
import './MenuPage.css';

export default function MenuPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        setCategories([
          { name: 'Pizzas Tradicionais', products: fakeProducts }
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

  return (
    <div className="menu-page">
      <header className="header glass-panel">
        <div className="header-info">
          <h1>EasyPizza</h1>
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
                {category.products && category.products.map((product: any, index: number) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={handleOpenModal} 
                    delay={index * 0.1}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {cart.length > 0 && <Cart items={cart} />}

      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  );
}
