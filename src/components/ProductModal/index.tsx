import React, { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import './ProductModal.css';

import type { Product } from '../../types';

interface ProductModalProps {
  product: Product;
  availableProducts: Product[]; // All products from the API (for half/half and drinks)
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export default function ProductModal({ product, availableProducts, onClose, onAddToCart }: ProductModalProps) {
  
  // Real or mock local sizes/crusts/addons (in a real app, this would come from the API, 
  // but since we only created Product Categories, we will mock the variations here for UX)
  const pizzaSizes = [
    { id: 'sm', name: 'Pequena (4 fatias)', multiplier: 0.7 },
    { id: 'md', name: 'Média (6 fatias)', multiplier: 1 },
    { id: 'lg', name: 'Grande (8 fatias)', multiplier: 1.2 },
  ];
  
  const crustOptions = [
    { id: 'normal', name: 'Borda Tradicional', price: 0 },
    { id: 'catupiry', name: 'Recheada com Catupiry', price: 8.00 },
    { id: 'cheddar', name: 'Recheada com Cheddar', price: 8.00 },
  ];
  
  const addons = [
    { id: 'bacon', name: 'Extra Bacon', price: 5.00 },
    { id: 'cheese', name: 'Extra Queijo', price: 4.00 },
    { id: 'olives', name: 'Azeitonas', price: 2.00 },
  ];

  const [size, setSize] = useState(pizzaSizes[1]); // Média
  const [crust, setCrust] = useState(crustOptions[0]);
  const [isHalfHalf, setIsHalfHalf] = useState(false);
  const [secondHalf, setSecondHalf] = useState<any | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<any[]>([]);
  const [observation, setObservation] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  const isPizza = product.categoryName?.toLowerCase().includes('pizza') ?? true;

  // Trava o scroll da página de fundo
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const toggleDrink = (drink: any) => {
    setSelectedDrinks(prev => prev.find(d => d.id === drink.id) ? prev.filter(d => d.id !== drink.id) : [...prev, drink]);
  };

  // Cálculos financeiros do Pedido
  // Pricing Logic (Half and Half uses the AVERAGE between the two)
  const basePrice = product.price * size.multiplier;
  const halfPrice = isHalfHalf && secondHalf 
    ? ((basePrice / 2) + ((secondHalf.price * size.multiplier) / 2)) 
    : basePrice;
    
  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const addon = addons.find(a => a.id === addonId);
    return sum + (addon?.price || 0);
  }, 0);
  
  const drinksTotal = selectedDrinks.reduce((sum, d) => sum + d.price, 0);
  
  const unitTotal = halfPrice + crust.price + addonsTotal;
  const finalTotal = (unitTotal * quantity) + drinksTotal;

  const handleConfirm = () => {
    const finalItem = {
      baseProduct: product,
      size,
      crust,
      isHalfHalf,
      secondHalf,
      selectedAddons,
      selectedDrinks,
      observation,
      quantity,
      finalPrice: finalTotal
    };
    onAddToCart(finalItem);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="modal-header-image">
          {product.imageUrl ? (
             <img src={product.imageUrl} alt={product.name} />
          ) : (
             <div style={{ height: '200px', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h3>{product.name}</h3>
             </div>
          )}
        </div>

        <div className="modal-scroll-area">
          <div className="modal-intro">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>

          {isPizza && (
            <section className="modal-section">
              <div className="section-header">
                <h3>Escolha o Tamanho</h3>
                <span className="required-badge">Obrigatório</span>
              </div>
              <div className="radio-group">
                {pizzaSizes.map(s => (
                  <label key={s.id} className={`radio-card ${size.id === s.id ? 'selected' : ''}`}>
                    <input type="radio" name="size" checked={size.id === s.id} onChange={() => setSize(s)} />
                    <div className="radio-info">
                      <span className="name">{s.name}</span>
                      <span className="price">R$ {(product.price * s.multiplier).toFixed(2)}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          )}

          {isPizza && (
            <section className="modal-section">
              <div className="section-header">
                <h3>Borda da Pizza</h3>
              </div>
              <div className="radio-group">
                {crustOptions.map(c => (
                  <label key={c.id} className={`radio-card ${crust.id === c.id ? 'selected' : ''}`}>
                    <input type="radio" name="crust" checked={crust.id === c.id} onChange={() => setCrust(c)} />
                    <div className="radio-info">
                      <span className="name">{c.name}</span>
                      <span className="price">{c.price > 0 ? `+ R$ ${c.price.toFixed(2)}` : 'Grátis'}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>
          )}

          {isPizza && size.id !== 'sm' && (
            <section className="modal-section highlight-section">
              <div className="section-header">
                <h3>Dividir Sabores? (Meio a Meio)</h3>
              </div>
              <label className="toggle-container">
                <input type="checkbox" checked={isHalfHalf} onChange={(e) => {
                  setIsHalfHalf(e.target.checked);
                  if(!e.target.checked) setSecondHalf(null);
                }} />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Quero 2 sabores diferentes</span>
              </label>

              {isHalfHalf && (
                <div className="half-half-selection">
                  <h4>Escolha a segunda metade:</h4>
                  <div className="horizontal-scroll">
                    {availableProducts
                       .filter(p => p.categoryId === product.categoryId && p.id !== product.id)
                       .map(p => (
                      <div key={p.id} className={`half-card ${secondHalf?.id === p.id ? 'selected' : ''}`} onClick={() => setSecondHalf(p)}>
                        <div className="half-card-img-placeholder"></div>
                        <span>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {isPizza && (
            <section className="modal-section">
              <div className="section-header">
                <h3>Adicionais Extras</h3>
              </div>
              <div className="checkbox-group">
                {addons.map(a => (
                  <label key={a.id} className="checkbox-item">
                    <input type="checkbox" checked={selectedAddons.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                    <span className="name">{a.name}</span>
                    <span className="price">+ R$ {a.price.toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {isPizza && (
            <section className="modal-section cross-sell">
              <div className="section-header">
                <h3>Aproveite e leve bebidas</h3>
              </div>
              <div className="horizontal-scroll">
                {availableProducts
                  .filter(p => p.categoryName?.toLowerCase().includes('bebida') || p.categoryName?.toLowerCase().includes('drink'))
                  .map(drink => (
                  <div key={drink.id} className={`drink-card ${selectedDrinks.find(d => d.id === drink.id) ? 'selected' : ''}`} onClick={() => toggleDrink(drink)}>
                    <div className="drink-card-img-placeholder">🥤</div>
                    <span className="name">{drink.name}</span>
                    <span className="price">+ R$ {drink.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="modal-section">
            <div className="section-header">
              <h3>Alguma observação?</h3>
            </div>
            <textarea 
              className="observation-input" 
              placeholder="Ex: Tirar a cebola, assar bem a massa..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </section>
        </div>

        <div className="modal-footer">
          <div className="quantity-selector">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
          </div>
          <button className="confirm-btn" onClick={handleConfirm}>
            Adicionar • R$ {finalTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
