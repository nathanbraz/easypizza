import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { api, getTenantSlugFromUrl } from '../../lib/api';
import './ProductModal.css';

import type { Product } from '../../types';

interface ProductModalProps {
  product: Product;
  availableProducts: Product[]; // All products from the API (for half/half and drinks)
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export default function ProductModal({ product, availableProducts, onClose, onAddToCart }: ProductModalProps) {
  const tenantSlug = getTenantSlugFromUrl();
  const [optionGroups, setOptionGroups] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // State for radio/checkbox selections (key: groupId, value: array of itemIds)
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  // State for counter quantities (key: itemId, value: quantity number)
  const [counterQuantities, setCounterQuantities] = useState<Record<string, number>>({});

  const [isHalfHalf, setIsHalfHalf] = useState(false);
  const [secondHalf, setSecondHalf] = useState<any | null>(null);
  
  // Cross-sell Drinks
  const [selectedDrinks, setSelectedDrinks] = useState<any[]>([]);
  const [observation, setObservation] = useState('');
  const [quantity, setQuantity] = useState(1);
  
  // Check if product belongs to a category that allows half and half. For now, fallback to "pizza" logic if flag is missing.
  // Ideally, the backend product DTO should include category.allowsHalfAndHalf.
  const allowsHalfAndHalf = product.categoryName?.toLowerCase().includes('pizza') ?? false;

  useLockBodyScroll();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const res = await api.get(`/productoptions/${tenantSlug}/product/${product.id}`);
        const groups = res.data;
        setOptionGroups(groups);
        
        // Auto-select first item for radio buttons (maxChoices === 1 and isRequired === true)
        const initialSelections: Record<string, string[]> = {};
        groups.forEach((g: any) => {
          if (g.maxChoices === 1 && g.isRequired && g.options?.length > 0) {
            initialSelections[g.id] = [g.options[0].id];
          } else {
            initialSelections[g.id] = [];
          }
        });
        setSelections(initialSelections);
        
      } catch (error) {
        console.error('Error fetching product options', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, [product.id, tenantSlug]);

  const handleToggleOption = (groupId: string, itemId: string, maxChoices: number) => {
    setSelections(prev => {
      const currentSelection = prev[groupId] || [];
      
      if (maxChoices === 1) {
        // Radio button behavior
        return { ...prev, [groupId]: [itemId] };
      } else {
        // Checkbox behavior
        if (currentSelection.includes(itemId)) {
          return { ...prev, [groupId]: currentSelection.filter(id => id !== itemId) };
        } else {
          if (currentSelection.length < maxChoices) {
            return { ...prev, [groupId]: [...currentSelection, itemId] };
          } else {
            return prev; // Reached max limit
          }
        }
      }
    });
  };

  const handleCounterChange = (groupId: string, itemId: string, delta: number, groupMax: number) => {
    setCounterQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);

      // Calculate total items in this group
      const group = optionGroups.find((g: any) => g.id === groupId);
      if (!group) return prev;
      const totalInGroup = group.options.reduce((sum: number, opt: any) => {
        const qty = opt.id === itemId ? newQty : (prev[opt.id] || 0);
        return sum + qty;
      }, 0);

      if (totalInGroup > groupMax) return prev; // Exceeded group max
      return { ...prev, [itemId]: newQty };
    });
  };

  const toggleDrink = (drink: any) => {
    setSelectedDrinks(prev => prev.find(d => d.id === drink.id) ? prev.filter(d => d.id !== drink.id) : [...prev, drink]);
  };

  // Pricing Logic
  const basePrice = product.price;
  const finalBasePrice = isHalfHalf && secondHalf 
    ? ((basePrice / 2) + (secondHalf.price / 2)) 
    : basePrice;
    
  // Calculate total additional price from selected options (radio/checkbox)
  let optionsTotal = 0;
  const selectedOptionObjects: any[] = [];
  
  optionGroups.forEach((g: any) => {
    if (g.groupType === 'counter') {
      // Counter groups: sum quantities
      g.options.forEach((opt: any) => {
        const qty = counterQuantities[opt.id] || 0;
        if (qty > 0) {
          optionsTotal += (opt.additionalPrice || 0) * qty;
          selectedOptionObjects.push({ groupName: g.name, ...opt, quantity: qty });
        }
      });
    } else {
      // Radio/Checkbox groups
      const selectedIds = selections[g.id] || [];
      selectedIds.forEach((itemId: string) => {
        const item = g.options.find((opt: any) => opt.id === itemId);
        if (item) {
          optionsTotal += (item.additionalPrice || 0);
          selectedOptionObjects.push({ groupName: g.name, ...item, quantity: 1 });
        }
      });
    }
  });
  
  const drinksTotal = selectedDrinks.reduce((sum, d) => sum + d.price, 0);
  
  const unitTotal = finalBasePrice + optionsTotal;
  const finalTotal = (unitTotal * quantity) + drinksTotal;

  // Validation: counter groups just need to be present, radio/checkbox groups need minChoices
  const isValid = optionGroups.every((g: any) => {
    if (g.groupType === 'counter') return true; // counter is always optional
    const selectedCount = (selections[g.id] || []).length;
    return selectedCount >= g.minChoices;
  });

  const handleConfirm = () => {
    if (!isValid) {
      alert("Por favor, preencha todos os itens obrigatórios.");
      return;
    }
    
    const finalItem = {
      baseProduct: product,
      selectedOptions: selectedOptionObjects,
      isHalfHalf,
      secondHalf,
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
          <img src={product.imageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : (product.categoryName?.toLowerCase().includes('bebida') || product.name.toLowerCase().includes('cola') ? 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60' : 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60'))} alt={product.name} />
        </div>

        <div className="modal-scroll-area">
          <div className="modal-intro">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>

          {loadingOptions ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Carregando opções...
            </div>
          ) : (
            <>
              {optionGroups.map((group) => {
                const selectedCount = (selections[group.id] || []).length;
                const isGroupValid = selectedCount >= group.minChoices;
                const isMaxReached = selectedCount >= group.maxChoices;

                return (
                  <section key={group.id} className="modal-section">
                    <div className="section-header">
                      <div>
                        <h3>{group.name}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                          {group.minChoices > 0 ? `Escolha de ${group.minChoices} até ${group.maxChoices} opções` : `Escolha até ${group.maxChoices} opções`}
                        </p>
                      </div>
                      {group.minChoices > 0 && (
                        <span className="required-badge" style={{ backgroundColor: isGroupValid ? 'rgba(34, 197, 94, 0.1)' : '', color: isGroupValid ? '#22c55e' : '' }}>
                          {isGroupValid ? '✓ Concluído' : 'Obrigatório'}
                        </span>
                      )}
                    </div>
                    
                    <div className={group.groupType === 'counter' ? 'counter-group' : (group.maxChoices === 1 ? "radio-group" : "checkbox-group")}>
                      {group.options.map((opt: any) => {
                        const isSelected = (selections[group.id] || []).includes(opt.id);
                        const isMaxReached = (selections[group.id] || []).length >= group.maxChoices;
                        const disabled = !isSelected && isMaxReached && group.maxChoices > 1;

                        if (group.groupType === 'counter') {
                          // Render as Counter (- qty +)
                          const qty = counterQuantities[opt.id] || 0;
                          return (
                            <div key={opt.id} className="counter-item">
                              <div className="counter-item-info">
                                <span className="name">{opt.name}</span>
                                <span className="price">{opt.additionalPrice > 0 ? `R$ ${opt.additionalPrice.toFixed(2)}` : 'Grátis'}</span>
                              </div>
                              <div className="counter-controls">
                                <button 
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => handleCounterChange(group.id, opt.id, -1, group.maxChoices)}
                                  disabled={qty === 0}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="counter-value">{qty}</span>
                                <button 
                                  type="button"
                                  className="counter-btn"
                                  onClick={() => handleCounterChange(group.id, opt.id, 1, group.maxChoices)}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        } else if (group.maxChoices === 1) {
                          // Render as Radio Buttons
                          return (
                            <label key={opt.id} className={`radio-card ${isSelected ? 'selected' : ''}`}>
                              <input 
                                type="radio" 
                                name={`group_${group.id}`} 
                                checked={isSelected} 
                                onChange={() => handleToggleOption(group.id, opt.id, group.maxChoices)} 
                              />
                              <div className="radio-info">
                                <span className="name">{opt.name}</span>
                                <span className="price">{opt.additionalPrice > 0 ? `+ R$ ${opt.additionalPrice.toFixed(2)}` : (opt.additionalPrice < 0 ? `- R$ ${Math.abs(opt.additionalPrice).toFixed(2)}` : (product.price === 0 ? `R$ ${opt.additionalPrice.toFixed(2)}` : ''))}</span>
                              </div>
                            </label>
                          );
                        } else {
                          // Render as Checkboxes
                          return (
                            <label key={opt.id} className={`checkbox-item ${disabled ? 'disabled' : ''}`} style={{ opacity: disabled ? 0.5 : 1 }}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                disabled={disabled}
                                onChange={() => handleToggleOption(group.id, opt.id, group.maxChoices)} 
                              />
                              <span className="name">{opt.name}</span>
                              <span className="price">{opt.additionalPrice > 0 ? `+ R$ ${opt.additionalPrice.toFixed(2)}` : ''}</span>
                            </label>
                          );
                        }
                      })}
                    </div>
                  </section>
                );
              })}

              {allowsHalfAndHalf && (
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
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="quantity-selector">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
          </div>
          <button 
            className="confirm-btn" 
            onClick={handleConfirm}
            style={{ opacity: isValid ? 1 : 0.5 }}
          >
            Adicionar • R$ {finalTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
