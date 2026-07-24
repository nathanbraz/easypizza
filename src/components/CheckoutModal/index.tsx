import React, { useState } from 'react';
import { X, CheckCircle, Percent, MapPin, ChevronRight, ChevronLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import './CheckoutModal.css';

interface CheckoutModalProps {
  cart: any[];
  updateCart: (newCart: any[]) => void;
  availableProducts?: any[];
  tenantSlug: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CheckoutModal({ cart, updateCart, availableProducts = [], tenantSlug, onClose, onSuccess }: CheckoutModalProps) {
  // Step 1: Carrinho, Step 2: Endereço, Step 3: Pagamento
  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Formulário de Endereço
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({ street: '', number: '', neighborhood: '', city: '' });
  
  const subTotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  const deliveryFee = 5.00; 
  const total = Math.max(0, subTotal + deliveryFee - discountAmount);

  // Cart Management Functions
  const updateItemQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQuantity = item.quantity + delta;
    
    if (newQuantity < 1) return;
    
    // Recalculate price (unitPrice = finalPrice / oldQuantity)
    const unitPrice = item.finalPrice / item.quantity;
    item.quantity = newQuantity;
    item.finalPrice = unitPrice * newQuantity;
    
    updateCart(newCart);
  };

  const removeItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    updateCart(newCart);
    if (newCart.length === 0) {
      onClose(); // Se esvaziou o carrinho, fecha o modal
    }
  };

  const addDrinkToCart = (drink: any) => {
    const existingIndex = cart.findIndex(item => 
      item.baseProduct.id === drink.id && 
      !item.isHalfHalf && 
      !item.observation && 
      !item.size && 
      (!item.selectedAddons || item.selectedAddons.length === 0)
    );

    if (existingIndex >= 0) {
      updateItemQuantity(existingIndex, 1);
    } else {
      const newItem = {
        baseProduct: drink,
        quantity: 1,
        finalPrice: drink.price,
      };
      updateCart([...cart, newItem]);
    }
  };

  const fetchAddressByCep = async (cepCode: string) => {
    if(cepCode.length >= 8) {
       setAddress({ street: 'Av. Paulista', number: '', neighborhood: 'Bela Vista', city: 'São Paulo' });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    setCouponSuccess('');
    
    try {
      const response = await api.get(`/coupons/validate/${couponCode}`);
      const coupon = response.data;
      
      let discount = 0;
      if (coupon.discountPercentage) {
        discount = subTotal * (coupon.discountPercentage / 100);
      } else if (coupon.discountFixedAmount) {
        discount = coupon.discountFixedAmount;
      }
      
      setDiscountAmount(discount);
      setCouponSuccess(`Cupom aplicado! Desconto de R$ ${discount.toFixed(2)}`);
    } catch (err: any) {
      setDiscountAmount(0);
      setCouponError(err.response?.data?.error || 'Cupom inválido.');
    }
  };

  const handleFinishOrder = async () => {
    setTimeout(() => {
      onSuccess();
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up checkout-content">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="checkout-header">
          <div className="step-indicator">
             <div className={`step ${step >= 1 ? 'active' : ''}`}><ShoppingBag size={14}/></div>
             <ChevronRight size={14} color="#64748b" />
             <div className={`step ${step >= 2 ? 'active' : ''}`}><MapPin size={14}/></div>
             <ChevronRight size={14} color="#64748b" />
             <div className={`step ${step >= 3 ? 'active' : ''}`}>Pagamento</div>
          </div>
          <h2>
            {step === 1 && 'Seu Carrinho'}
            {step === 2 && 'Onde vamos entregar?'}
            {step === 3 && 'Finalizar Pedido'}
          </h2>
        </div>

        <div className="checkout-scroll">
          
          {/* STEP 1: CARRINHO RICO */}
          {step === 1 && (
             <div className="step-content animate-fade-in">
               <div className="rich-cart-items">
                 {cart.map((item, index) => (
                   <div key={index} className="rich-cart-item">
                     <div className="rich-cart-item-main">
                       <div className="rich-cart-image">
                         {item.baseProduct.imageUrl ? (
                           <img src={item.baseProduct.imageUrl} alt={item.baseProduct.name} />
                         ) : (
                           <div className="img-placeholder">🍕</div>
                         )}
                       </div>
                       <div className="rich-cart-details">
                         <h4>{item.baseProduct.name}</h4>
                         {item.size && <span className="cart-badge">{item.size.name}</span>}
                         <div className="cart-price">R$ {item.finalPrice.toFixed(2)}</div>
                       </div>
                     </div>
                     
                     <div className="rich-cart-customizations">
                       {item.baseProduct.description && <div className="custom-item description">Ingredientes: {item.baseProduct.description}</div>}
                       {item.isHalfHalf && <div className="custom-item highlight">• 1/2 {item.secondHalf?.name}</div>}
                       {item.crust && item.crust.price > 0 && <div className="custom-item">• Borda: {item.crust.name} (+R${item.crust.price.toFixed(2)})</div>}
                       
                       {item.selectedAddons && item.selectedAddons.map((addon: any, idx: number) => (
                          <div key={idx} className="custom-item addon">• Adicional: {addon.name}</div>
                       ))}
                       
                       {item.selectedDrinks && item.selectedDrinks.map((d: any, idx: number) => (
                          <div key={idx} className="custom-item drink">• Bebida inclusa: {d.name}</div>
                       ))}
                       
                       {item.observation && <div className="custom-obs">Observação: {item.observation}</div>}
                     </div>

                     <div className="rich-cart-actions">
                       <div className="qty-controls">
                         <button onClick={() => updateItemQuantity(index, -1)}><Minus size={16}/></button>
                         <span>{item.quantity}</span>
                         <button onClick={() => updateItemQuantity(index, 1)}><Plus size={16}/></button>
                       </div>
                       <button className="delete-btn" onClick={() => removeItem(index)}>
                         <Trash2 size={18} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Cross-Sell Bebidas */}
               {availableProducts.filter(p => p.categoryName?.toLowerCase().includes('bebida') || p.categoryName?.toLowerCase().includes('drink')).length > 0 && (
                 <div className="cross-sell-section">
                   <h3 className="cross-sell-title">Aproveite e leve também:</h3>
                   <div className="horizontal-scroll">
                     {availableProducts
                       .filter(p => p.categoryName?.toLowerCase().includes('bebida') || p.categoryName?.toLowerCase().includes('drink'))
                       .map(drink => (
                         <div key={drink.id} className="cross-sell-card" onClick={() => addDrinkToCart(drink)}>
                           <div className="cross-sell-img">🥤</div>
                           <span className="cross-sell-name">{drink.name}</span>
                           <span className="cross-sell-price">+ R$ {drink.price.toFixed(2)}</span>
                           <button className="cross-sell-add"><Plus size={14} /> Adicionar</button>
                         </div>
                       ))}
                   </div>
                 </div>
               )}
             </div>
          )}

          {/* STEP 2: ENDEREÇO */}
          {step === 2 && (
             <div className="step-content animate-fade-in">
               <section className="checkout-section">
                 <div className="form-group">
                   <label>CEP</label>
                   <div className="input-with-icon">
                     <MapPin size={18} />
                     <input 
                       type="text" 
                       placeholder="00000-000" 
                       value={cep} 
                       onChange={(e) => {
                         setCep(e.target.value);
                         fetchAddressByCep(e.target.value.replace(/\D/g, ''));
                       }}
                     />
                   </div>
                 </div>
                 
                 <div className="form-row">
                   <div className="form-group" style={{flex: 3}}>
                     <label>Rua</label>
                     <input type="text" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                   </div>
                   <div className="form-group" style={{flex: 1}}>
                     <label>Número</label>
                     <input type="text" value={address.number} onChange={e => setAddress({...address, number: e.target.value})} />
                   </div>
                 </div>
                 
                 <div className="form-row">
                   <div className="form-group">
                     <label>Bairro</label>
                     <input type="text" value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} />
                   </div>
                   <div className="form-group">
                     <label>Cidade</label>
                     <input type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                   </div>
                 </div>
               </section>
             </div>
          )}

          {/* STEP 3: PAGAMENTO E RESUMO */}
          {step === 3 && (
             <div className="step-content animate-fade-in">
               <section className="checkout-section">
                 <h3>Cupom de Desconto</h3>
                 <div className="coupon-container">
                   <div className="coupon-input-wrapper">
                     <Percent size={18} color="#94a3b8" />
                     <input 
                       type="text" 
                       placeholder="Código" 
                       value={couponCode} 
                       onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                     />
                     <button onClick={handleApplyCoupon}>Aplicar</button>
                   </div>
                   {couponError && <span className="coupon-msg error">{couponError}</span>}
                   {couponSuccess && <span className="coupon-msg success">{couponSuccess}</span>}
                 </div>
               </section>

               <section className="checkout-section totals-section">
                 <div className="total-row"><span>Subtotal ({cart.length} itens)</span><span>R$ {subTotal.toFixed(2)}</span></div>
                 <div className="total-row"><span>Entrega</span><span>R$ {deliveryFee.toFixed(2)}</span></div>
                 {discountAmount > 0 && (
                   <div className="total-row discount-row"><span>Desconto</span><span>- R$ {discountAmount.toFixed(2)}</span></div>
                 )}
                 <div className="total-row grand-total"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
               </section>
             </div>
          )}
        </div>

        <div className="checkout-footer">
          {step === 1 && (
             <button className="primary-button" style={{width: '100%'}} onClick={() => setStep(2)}>
               Informar Endereço <ChevronRight size={20} />
             </button>
          )}
          {step === 2 && (
             <div style={{display: 'flex', gap: '12px', width: '100%'}}>
               <button className="secondary-button" onClick={() => setStep(1)}>
                 <ChevronLeft size={20} /> Voltar
               </button>
               <button className="primary-button" style={{flex: 1}} onClick={() => setStep(3)}>
                 Ir para Pagamento <ChevronRight size={20} />
               </button>
             </div>
          )}
          {step === 3 && (
             <div style={{display: 'flex', gap: '12px', width: '100%'}}>
               <button className="secondary-button" onClick={() => setStep(2)}>
                 <ChevronLeft size={20} /> Voltar
               </button>
               <button className="primary-button" style={{flex: 1}} onClick={handleFinishOrder}>
                 <CheckCircle size={20} /> Finalizar Pedido
               </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
