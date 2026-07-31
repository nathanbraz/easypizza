import React, { useState } from 'react';
import { X, CheckCircle, Ticket, MapPin, ChevronRight, ChevronLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import './CheckoutModal.css';
import ProductModal from '../ProductModal';

interface CheckoutModalProps {
  cart: any[];
  updateCart: (newCart: any[]) => void;
  availableProducts?: any[];
  tenantSlug: string;
  storeSettings?: any;
  onClose: () => void;
  onSuccess: (orderData?: any) => void;
}

export default function CheckoutModal({ cart, updateCart, availableProducts = [], tenantSlug, storeSettings, onClose, onSuccess }: CheckoutModalProps) {
  useLockBodyScroll();
  // Step 1: Carrinho, Step 2: Endereço, Step 3: Pagamento
  const [step, setStep] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Cross Sell Product Modal
  const [crossSellProduct, setCrossSellProduct] = useState<any>(null);

  // Delivery (1) or Pickup (2)
  const [orderType, setOrderType] = useState<number>(storeSettings?.acceptingDelivery ? 1 : (storeSettings?.acceptingPickup ? 2 : 1));
  const [paymentTypeId, setPaymentTypeId] = useState<string>('');
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [changeFor, setChangeFor] = useState<string>('');

  React.useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const res = await api.get('/settings');
        setPaymentTypes(res.data.paymentTypes || []);
      } catch (err) {
        console.error(err);
      }
    };
    if (step === 3) fetchPaymentTypes();
  }, [step]);

  // Formulário de Endereço preenchido com endereço salvo do cliente (se houver)
  const [customerInfo] = useState<any | null>(() => {
    const saved = localStorage.getItem('@EasyPizza:CustomerInfo');
    return saved ? JSON.parse(saved) : null;
  });

  const [cep, setCep] = useState(() => {
    let initialCep = customerInfo?.defaultAddress?.zipCode || '76400000';
    let raw = initialCep.replace(/\D/g, '');
    if (raw.length > 5) {
      return raw.substring(0, 5) + '-' + raw.substring(5, 8);
    }
    return raw;
  });
  const [isNoNumber, setIsNoNumber] = useState(false);
  const [address, setAddress] = useState(() => {
    if (customerInfo?.defaultAddress) {
      return {
        street: customerInfo.defaultAddress.street || '',
        number: customerInfo.defaultAddress.number || '',
        neighborhood: customerInfo.defaultAddress.neighborhood || '',
        city: customerInfo.defaultAddress.city || '',
        state: customerInfo.defaultAddress.state || '',
        referencePoint: customerInfo.defaultAddress.complement ? customerInfo.defaultAddress.complement.replace('Ref: ', '') : ''
      };
    }
    return { street: '', number: '', neighborhood: '', city: '', state: '', referencePoint: '' };
  });
  const [latitude, setLatitude] = useState<number | null>(() => customerInfo?.defaultAddress?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(() => customerInfo?.defaultAddress?.longitude || null);
  const [locationStatus, setLocationStatus] = useState<string>('');
  
  const subTotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  
  let deliveryFee = 0;
  if (orderType === 1) { // Delivery
    deliveryFee = storeSettings?.deliveryFee || 0;
    if (storeSettings?.freeDeliveryThreshold && subTotal >= storeSettings.freeDeliveryThreshold) {
      deliveryFee = 0;
    }
  }
  
  const total = Math.max(0, subTotal + deliveryFee - discountAmount);

  const isStoreClosed = storeSettings && !storeSettings.isStoreOpen;
  const doesNotMeetMinimum = storeSettings && subTotal < storeSettings.minimumOrderAmount;
  
  // Validation for finish button
  const canFinishOrder = !isStoreClosed && !doesNotMeetMinimum && paymentTypeId !== '';


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
    // Open product modal to allow size/option selection
    setCrossSellProduct(drink);
  };

  const fetchAddressByCep = async (cepCode: string) => {
    if(cepCode.length === 8) {
       try {
         const response = await fetch(`https://viacep.com.br/ws/${cepCode}/json/`);
         const data = await response.json();
         if (!data.erro) {
           setAddress(prev => ({
             ...prev,
             street: data.logradouro || '',
             neighborhood: data.bairro || '',
             city: data.localidade || '',
             state: data.uf || ''
           }));
         }
       } catch (error) {
         console.error("Erro ao buscar CEP", error);
       }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocalização não é suportada no seu navegador');
      return;
    }

    setLocationStatus('Buscando...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus('📍 Localização capturada com sucesso!');
      },
      () => {
        setLocationStatus('Não foi possível capturar a localização.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleApplyCoupon = async (codeToApply?: string, isAuto: boolean = false) => {
    const code = codeToApply || couponCode;
    if (!code) return;
    setCouponError('');
    setCouponSuccess('');
    
    try {
      const response = await api.get(`/coupons/validate/${code}`);
      const coupon = response.data;
      
      let discount = 0;
      if (coupon.discountPercentage) {
        discount = subTotal * (coupon.discountPercentage / 100);
      } else if (coupon.discountFixedAmount) {
        discount = coupon.discountFixedAmount;
      }
      
      setDiscountAmount(discount);
      setCouponSuccess(`Cupom aplicado! Desconto de R$ ${discount.toFixed(2)}`);
      if (codeToApply) setCouponCode(codeToApply);
    } catch (err: any) {
      setDiscountAmount(0);
      if (isAuto) {
        // Falha silenciosa para cupons globais que expiraram ou foram desativados
        setCouponCode('');
      } else {
        setCouponError(err.response?.data?.error || 'Cupom inválido.');
      }
    }
  };

  React.useEffect(() => {
    if (step === 3 && storeSettings?.activeGlobalCouponCode && !discountAmount && !couponError) {
      handleApplyCoupon(storeSettings.activeGlobalCouponCode, true);
    }
  }, [step, storeSettings?.activeGlobalCouponCode]);

  const handleFinishOrder = async () => {
    try {
      const storedCustomerInfo = localStorage.getItem('@EasyPizza:CustomerInfo');
      const parsedInfo = storedCustomerInfo ? JSON.parse(storedCustomerInfo) : null;
      const customerId = parsedInfo?.customerId || localStorage.getItem('@EasyPizza:CustomerId');

      if (!customerId) {
        alert("Sessão de cliente não encontrada. Por favor, retorne ao WhatsApp para gerar um link de acesso.");
        return;
      }

      let addrId = parsedInfo?.defaultAddress?.id || null;

      // Se for delivery, salva/atualiza endereço do cliente
      if (orderType === 1) {
        if (!address.street || (!address.number && !isNoNumber) || !address.neighborhood) {
          alert("Por favor, preencha a rua, número e bairro do endereço.");
          return;
        }
        try {
          const addrPayload = {
            street: address.street,
            number: isNoNumber ? 'SN' : address.number,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state || 'SP',
            zipCode: cep || '00000000',
            complement: address.referencePoint ? `Ref: ${address.referencePoint}` : '',
            latitude: latitude,
            longitude: longitude
          };
          const addrRes = await api.put(`/customers/${tenantSlug}/${customerId}/address`, addrPayload);
          const createdAddr = addrRes.data.data || addrRes.data;
          if (createdAddr && (createdAddr.id || createdAddr.Id)) {
            addrId = createdAddr.id || createdAddr.Id;
            if (parsedInfo) {
              parsedInfo.defaultAddress = createdAddr;
              localStorage.setItem('@EasyPizza:CustomerInfo', JSON.stringify(parsedInfo));
            }
          }
        } catch (addrErr) {
          console.error("Erro ao salvar endereço", addrErr);
        }
      }

      // POST order to API
      const itemsPayload = cart.map(item => ({
        productId: item.baseProduct.id,
        quantity: item.quantity,
        unitPrice: item.finalPrice / item.quantity,
        notes: item.observation || null,
        addons: [
          // Opções selecionadas pelo cliente (tamanho, borda, adicionais etc.)
          ...(item.selectedOptions?.map((opt: any) => ({
            productOptionItemId: opt.id || null,
            addonName: opt.name,
            price: opt.additionalPrice || 0,
            quantity: opt.quantity || 1
          })) || []),
          // Bebidas selecionadas no modal do produto (cross-sell)
          ...(item.selectedDrinks?.map((d: any) => ({
            productOptionItemId: null,
            addonName: d.name,
            price: d.price || 0,
            quantity: 1
          })) || [])
        ]
      }));
      
      const selectedPayment = paymentTypes.find(pt => pt.id === paymentTypeId);
      const isCash = selectedPayment && selectedPayment.name.toLowerCase().includes('dinheiro');

      const orderPayload = {
        customerId: customerId,
        customerAddressId: orderType === 1 ? addrId : null,
        type: orderType,
        paymentTypeId: paymentTypeId,
        couponCode: couponCode || null,
        changeFor: (isCash && changeFor) ? Number(changeFor) : null,
        items: itemsPayload
      };
      
      const res = await api.post(`/orders/${tenantSlug}`, orderPayload);
      const createdOrder = res.data.data || res.data;
      
      if (createdOrder && (createdOrder.id || createdOrder.Id)) {
        localStorage.setItem('@EasyPizza:LastOrderId', createdOrder.id || createdOrder.Id);
      }
      if (customerId) {
        localStorage.setItem('@EasyPizza:CustomerId', customerId);
      }

      onSuccess(createdOrder);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao finalizar pedido");
    }
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '40px' }}>
            <h2>
              {step === 1 && 'Seu Carrinho'}
              {step === 2 && 'Onde vamos entregar?'}
              {step === 3 && 'Finalizar Pedido'}
            </h2>
            {step === 1 && cart.length > 0 && (
              <button 
                type="button" 
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja limpar todo o seu carrinho?')) {
                    updateCart([]);
                    onClose();
                  }
                }} 
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Trash2 size={14} /> Limpar Carrinho
              </button>
            )}
          </div>
        </div>

        <div className="checkout-scroll">
          
          {/* STEP 1: CARRINHO RICO */}
          {step === 1 && (
             <div className="step-content animate-fade-in">
               <div className="rich-cart-items">
                 {cart.map((item, index) => {
                   const halfOption = item.selectedOptions?.find((opt: any) => opt.groupName === 'Meio a Meio');
                   const isHalf = !!halfOption;
                   
                   let title = item.baseProduct.name;
                   let description = item.baseProduct.description;
                   
                   if (isHalf) {
                     let halfDesc = halfOption.description;
                     if (!halfDesc) {
                       const originalName = halfOption.name.replace('1/2 ', '').replace('Meia ', '');
                       const foundProduct = availableProducts.find(p => p.name === originalName);
                       if (foundProduct) halfDesc = foundProduct.description;
                     }

                     title = `Meia ${item.baseProduct.name} & ${halfOption.name.replace('1/2 ', 'Meia ')}`;
                     description = `Metade 1: ${item.baseProduct.description || 'Sem descrição'}\nMetade 2: ${halfDesc || 'Sem descrição'}`;
                   }

                   const img = item.baseProduct.imageUrl || (item.baseProduct.imageUrls && item.baseProduct.imageUrls.length > 0 ? item.baseProduct.imageUrls[0] : null);

                   return (
                   <div key={index} className="rich-cart-item">
                     <div className="rich-cart-item-main">
                       <div className="rich-cart-image">
                         {img ? (
                           <img src={img} alt={item.baseProduct.name} />
                         ) : (
                           <div className="img-placeholder">
                             {item.baseProduct.categoryName?.toLowerCase().includes('bebida') ? '🥤' : '🍕'}
                           </div>
                         )}
                       </div>
                       <div className="rich-cart-details">
                         <h4 style={{ lineHeight: '1.2', paddingBottom: '4px' }}>{title}</h4>
                         {item.size && <span className="cart-badge">{item.size.name}</span>}
                         <div className="cart-price">R$ {item.finalPrice.toFixed(2)}</div>
                       </div>
                     </div>
                     
                     <div className="rich-cart-customizations">
                       {description && <div className="custom-item description" style={{ whiteSpace: 'pre-line' }}>{isHalf ? '' : 'Ingredientes: '}{description}</div>}

                       
                       {item.selectedOptions && item.selectedOptions.filter((opt: any) => opt.groupName !== 'Meio a Meio').map((opt: any, idx: number) => (
                          <div key={idx} className="custom-item addon">• {opt.groupName}: {opt.name} {opt.additionalPrice > 0 ? `(+R$ ${opt.additionalPrice.toFixed(2)})` : ''}</div>
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
                 )})}
               </div>

               {/* Cross-Sell Bebidas */}
               {(() => {
                 const hasDrinkInCart = cart.some(item => 
                   item.baseProduct.categoryName?.toLowerCase().includes('bebida') || 
                   item.baseProduct.categoryName?.toLowerCase().includes('drink') || 
                   (item.selectedDrinks && item.selectedDrinks.length > 0)
                 );
                 
                 if (hasDrinkInCart) return null;

                 const availableDrinks = availableProducts.filter(p => p.showInCrossSell === true);
                 
                 if (availableDrinks.length === 0) return null;

                 return (
                   <div className="cross-sell-section">
                     <h3 className="cross-sell-title">Aproveite e leve também:</h3>
                     <div className="horizontal-scroll">
                        {availableDrinks.map(drink => {
                          let displayPrice = `+ R$ ${drink.price.toFixed(2)}`;
                          
                          if (drink.price === 0) {
                            let minAdditionalPrice = 0;
                            let hasMandatoryOptions = false;
                            
                            if (drink.optionGroups && drink.optionGroups.length > 0) {
                              drink.optionGroups.forEach((group: any) => {
                                if (group.minChoices > 0 && group.options && group.options.length > 0) {
                                  hasMandatoryOptions = true;
                                  const cheapestOption = Math.min(...group.options.map((o: any) => o.additionalPrice));
                                  minAdditionalPrice += (cheapestOption * group.minChoices);
                                }
                              });
                            }
                            
                            if (hasMandatoryOptions && minAdditionalPrice > 0) {
                              displayPrice = `A partir de R$ ${minAdditionalPrice.toFixed(2)}`;
                            } else if (drink.optionGroups && drink.optionGroups.length > 0) {
                              displayPrice = 'Ver opções';
                            } else {
                              displayPrice = 'Grátis';
                            }
                          }
                          
                          const img = drink.imageUrl || (drink.imageUrls && drink.imageUrls.length > 0 ? drink.imageUrls[0] : null);
                          
                          return (
                            <div key={drink.id} className="cross-sell-card" onClick={() => addDrinkToCart(drink)}>
                              <div className="cross-sell-img" style={img ? { padding: 0 } : {}}>
                                {img ? (
                                  <img src={img} alt={drink.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                ) : (
                                  drink.categoryName?.toLowerCase().includes('bebida') ? '🥤' : '🍟'
                                )}
                              </div>
                              <span className="cross-sell-name">{drink.name}</span>
                              <span className="cross-sell-price">{displayPrice}</span>
                              <button className="cross-sell-add"><Plus size={14} /> Adicionar</button>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                 );
               })()}
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
                       maxLength={9}
                       onChange={(e) => {
                         let val = e.target.value.replace(/\D/g, '');
                         if (val.length > 5) val = val.substring(0, 5) + '-' + val.substring(5, 8);
                         setCep(val);
                         if (val.replace(/\D/g, '').length === 8) {
                           fetchAddressByCep(val.replace(/\D/g, ''));
                         }
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ margin: 0 }}>Número</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: isNoNumber ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isNoNumber ? 'bold' : 'normal', transition: '0.2s' }}>Sem Nº</span>
                          <label className="custom-toggle">
                            <input type="checkbox" checked={isNoNumber} onChange={e => setIsNoNumber(e.target.checked)} />
                            <span className="custom-toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        disabled={isNoNumber} 
                        value={isNoNumber ? 'SN' : address.number} 
                        onChange={e => setAddress({...address, number: e.target.value})} 
                        style={isNoNumber ? { opacity: 0.7 } : {}} 
                      />
                    </div>
                 </div>
                 
                 <div className="form-row">
                   <div className="form-group" style={{flex: 2}}>
                     <label>Bairro</label>
                     <input type="text" value={address.neighborhood} onChange={e => setAddress({...address, neighborhood: e.target.value})} />
                   </div>
                   <div className="form-group" style={{flex: 2}}>
                     <label>Cidade</label>
                     <input type="text" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                   </div>
                   <div className="form-group" style={{flex: 1}}>
                     <label>UF</label>
                     <input type="text" value={address.state} onChange={e => setAddress({...address, state: e.target.value})} maxLength={2} style={{ textTransform: 'uppercase' }} />
                   </div>
                 </div>

                 <div className="form-group">
                   <label>Ponto de Referência (Opcional)</label>
                   <input type="text" placeholder="Ex: Próximo ao supermercado" value={address.referencePoint} onChange={e => setAddress({...address, referencePoint: e.target.value})} />
                 </div>
                  
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <button type="button" className="secondary-button" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleGetLocation}>
                      <MapPin size={18} /> Usar minha localização atual
                    </button>
                    {locationStatus && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: locationStatus.includes('sucesso') ? '#22c55e' : 'var(--primary)' }}>
                        {locationStatus}
                      </div>
                    )}
                    {latitude && longitude && (
                      <div className="map-preview" style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <iframe 
                          width="100%" 
                          height="200" 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight={0} 
                          marginWidth={0} 
                          src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=pt-BR&z=15&output=embed`}
                        ></iframe>
                      </div>
                    )}
                  </div>
                </section>
              </div>
          )}

            {/* STEP 3: PAGAMENTO E RESUMO */}
           {step === 3 && (
              <div className="step-content animate-fade-in">
                <section className="checkout-section">
                  <h3>Resumo do Pedido</h3>
                 <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                   {cart.map((item, index) => (
                     <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: index < cart.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                       <div style={{ display: 'flex', gap: '12px' }}>
                         <span style={{ color: 'var(--primary)', fontWeight: 'bold', background: 'rgba(255, 87, 34, 0.1)', padding: '2px 8px', borderRadius: '4px', height: 'fit-content' }}>{item.quantity}x</span>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.baseProduct.name}</span>
                           {item.selectedOptions && item.selectedOptions.map((opt: any, idx: number) => (
                             <span key={idx} style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{opt.name}</span>
                           ))}

                         </div>
                       </div>
                       <span style={{ fontWeight: 'bold' }}>R$ {item.finalPrice.toFixed(2)}</span>
                     </div>
                   ))}
                 </div>
               </section>

                <section className="checkout-section">
                  <h3>Como deseja receber?</h3>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '6px', marginBottom: '24px' }}>
                    {storeSettings?.acceptingDelivery && (
                      <button 
                        onClick={() => setOrderType(1)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: orderType === 1 ? 'var(--primary)' : 'transparent', color: orderType === 1 ? 'white' : '#94a3b8', fontWeight: 'bold', transition: 'all 0.2s ease' }}
                      >
                        Entrega Delivery
                      </button>
                    )}
                    {storeSettings?.acceptingPickup && (
                      <button 
                        onClick={() => setOrderType(2)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: orderType === 2 ? 'var(--primary)' : 'transparent', color: orderType === 2 ? 'white' : '#94a3b8', fontWeight: 'bold', transition: 'all 0.2s ease' }}
                      >
                        Retirada no Balcão
                      </button>
                    )}
                  </div>
                </section>
                
                <section className="checkout-section">
                  <h3>Forma de Pagamento</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '24px' }}>
                    {paymentTypes.filter(pt => pt.isActive).map(pt => (
                      <button 
                        key={pt.id}
                        onClick={() => setPaymentTypeId(pt.id)}
                        style={{ padding: '12px', borderRadius: '8px', border: paymentTypeId === pt.id ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', background: paymentTypeId === pt.id ? 'rgba(255, 87, 34, 0.1)' : 'rgba(255,255,255,0.02)', color: 'white', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid', borderColor: paymentTypeId === pt.id ? 'var(--primary)' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {paymentTypeId === pt.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                        </div>
                        {pt.name}
                      </button>
                    ))}
                    {paymentTypes.filter(pt => pt.isActive).length === 0 && (
                      <div style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma forma de pagamento disponível no momento.</div>
                    )}
                    
                    {(() => {
                      const selectedPayment = paymentTypes.find(pt => pt.id === paymentTypeId);
                      const isCash = selectedPayment && selectedPayment.name.toLowerCase().includes('dinheiro');
                      
                      if (isCash) {
                        return (
                          <div style={{ marginTop: '8px', background: 'rgba(255, 87, 34, 0.05)', padding: '16px', borderRadius: '8px', border: '1px dashed rgba(255, 87, 34, 0.3)' }} className="animate-fade-in">
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Troco para: (Opcional)</label>
                            <input 
                              type="text" 
                              placeholder="Ex: 50" 
                              value={changeFor} 
                              onChange={(e) => setChangeFor(e.target.value.replace(/\D/g, ''))}
                              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                            />
                            <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deixe em branco se não precisar de troco.</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </section>



               <section className="checkout-section">
                 <h3>Cupom de Desconto</h3>
                 <div className="coupon-container">
                   <div className="coupon-input-wrapper">
                     <Ticket size={18} color="var(--primary)" />
                     <input 
                       type="text" 
                       placeholder="Código" 
                       value={couponCode} 
                       onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                     />
                     <button onClick={() => handleApplyCoupon()}>Aplicar</button>
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
                <button 
                  className="primary-button" 
                  style={{flex: 1, opacity: (!canFinishOrder) ? 0.5 : 1, cursor: (!canFinishOrder) ? 'not-allowed' : 'pointer'}} 
                  onClick={handleFinishOrder}
                  disabled={!canFinishOrder}
                  title={isStoreClosed ? "A loja está fechada" : doesNotMeetMinimum ? `Pedido mínimo é R$ ${storeSettings?.minimumOrderAmount.toFixed(2)}` : paymentTypeId === '' ? "Selecione uma forma de pagamento" : ""}
                >
                  <CheckCircle size={20} /> Finalizar Pedido
                </button>
             </div>
          )}
        </div>
      </div>
      
      {crossSellProduct && (
        <ProductModal 
          product={crossSellProduct}
          availableProducts={availableProducts}
          onClose={() => setCrossSellProduct(null)}
          onAddToCart={(item) => {
             updateCart([...cart, item]);
             setCrossSellProduct(null);
          }}
        />
      )}
    </div>
  );
}
