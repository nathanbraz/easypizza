import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, X, Check, XCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import '../Catalog/Catalog.css';
import './Settings.css';

export default function SettingsManager() {
  const [activeTab, setActiveTab] = useState('geral');
  
  // Settings State
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState('');

  useLockBodyScroll(isModalOpen);

  useEffect(() => {
    if (activeTab === 'cupons') {
      loadCoupons();
    } else if (activeTab === 'geral') {
      loadSettings();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setStoreSettings(res.data.storeSettings);
      setPaymentTypes(res.data.paymentTypes);
    } catch (error) {
      console.error('Error loading settings', error);
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data);
    } catch (error) {
      console.error('Error loading coupons', error);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      isStoreOpen: formData.get('isStoreOpen') === 'on',
      deliveryFee: parseFloat(formData.get('deliveryFee') as string) || 0,
      minimumOrderAmount: parseFloat(formData.get('minimumOrderAmount') as string) || 0,
      estimatedDeliveryTimeMin: parseInt(formData.get('estimatedDeliveryTimeMin') as string) || 0,
      estimatedDeliveryTimeMax: parseInt(formData.get('estimatedDeliveryTimeMax') as string) || 0,
      freeDeliveryThreshold: formData.get('freeDeliveryThreshold') ? parseFloat(formData.get('freeDeliveryThreshold') as string) : null,
      acceptingPickup: formData.get('acceptingPickup') === 'on',
      acceptingDelivery: formData.get('acceptingDelivery') === 'on',
      messageOfTheDay: formData.get('messageOfTheDay')?.toString() || null,
      activeGlobalCouponCode: formData.get('activeGlobalCouponCode')?.toString() || null
    };

    try {
      setSavingSettings(true);
      await api.put('/settings', payload);
      alert('Configurações salvas com sucesso!');
      loadSettings();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePayment = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/settings/payment-types/${id}/toggle`, { isActive: !currentStatus });
      loadSettings();
    } catch (error) {
      console.error(error);
      alert('Erro ao alterar status do pagamento');
    }
  };

  const openCouponModal = (coupon?: any) => {
    setEditingCoupon(coupon || null);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeCouponModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const handleCouponSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    const formData = new FormData(e.currentTarget);
    
    const code = formData.get('code')?.toString().toUpperCase().trim();
    if (!code) {
      setFormError('O código é obrigatório');
      return;
    }

    const discountType = formData.get('discountType');
    const discountValue = parseFloat(formData.get('discountValue') as string);
    
    if (isNaN(discountValue) || discountValue <= 0) {
      setFormError('O valor de desconto deve ser maior que zero');
      return;
    }

    const usageLimit = parseInt(formData.get('usageLimit') as string) || 0;
    
    const payload: any = {
      code,
      discountPercentage: discountType === 'percentage' ? discountValue : null,
      discountFixedAmount: discountType === 'fixed' ? discountValue : null,
      usageLimit,
      expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt') as string).toISOString() : null
    };

    try {
      setLoadingForm(true);
      if (editingCoupon) {
        payload.isActive = formData.get('isActive') === 'on';
        await api.put(`/coupons/${editingCoupon.id}`, payload);
      } else {
        await api.post('/coupons', payload);
      }

      // Handle Global Coupon setting
      const isGlobal = formData.get('isGlobal') === 'on';
      const currentGlobalCode = storeSettings?.activeGlobalCouponCode;
      
      if (isGlobal && currentGlobalCode !== code) {
        // Set this coupon as global
        await api.put('/settings', {
          ...storeSettings,
          activeGlobalCouponCode: code
        });
      } else if (!isGlobal && currentGlobalCode === code) {
        // Remove this coupon from global
        await api.put('/settings', {
          ...storeSettings,
          activeGlobalCouponCode: null
        });
      }

      closeCouponModal();
      loadCoupons();
      loadSettings(); // Reload settings to get updated global coupon
    } catch (error: any) {
      console.error(error);
      setFormError(error.response?.data?.error || error.response?.data || 'Erro ao salvar cupom.');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleToggleCouponStatus = async (coupon: any) => {
    try {
      await api.put(`/coupons/${coupon.id}`, {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        discountFixedAmount: coupon.discountFixedAmount,
        expiresAt: coupon.expiresAt,
        usageLimit: coupon.usageLimit,
        isActive: !coupon.isActive
      });
      loadCoupons();
    } catch (error) {
      console.error(error);
      alert('Erro ao alterar status do cupom');
    }
  };

  return (
    <div className="settings-manager animate-fade-in">
      <header className="settings-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Configurações da Loja</h1>
          {activeTab === 'cupons' && (
            <button className="btn-primary" onClick={() => openCouponModal()}>
              <Plus size={20} />
              Novo Cupom
            </button>
          )}
        </div>
        
        <div className="catalog-tabs" style={{ marginTop: '16px' }}>
          <button className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Gerais</button>
          <button className={`tab-btn ${activeTab === 'cupons' ? 'active' : ''}`} onClick={() => setActiveTab('cupons')}>Cupons</button>
        </div>
      </header>

      {activeTab === 'geral' && storeSettings && (
        <form className="settings-grid" onSubmit={handleUpdateSettings}>
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3>Configurações Gerais</h3>
              <button type="submit" className="btn-primary" disabled={savingSettings}>
                {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label>Loja Aberta</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" name="isStoreOpen" defaultChecked={storeSettings.isStoreOpen} />
                    <span className="slider"></span>
                  </label>
                  <span className="setting-desc">Habilite para receber novos pedidos</span>
                </div>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label>Aceita Delivery</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" name="acceptingDelivery" defaultChecked={storeSettings.acceptingDelivery} />
                    <span className="slider"></span>
                  </label>
                  <span className="setting-desc">Permite entrega em casa</span>
                </div>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label>Aceita Retirada</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" name="acceptingPickup" defaultChecked={storeSettings.acceptingPickup} />
                    <span className="slider"></span>
                  </label>
                  <span className="setting-desc">Permite retirada no balcão</span>
                </div>
              </div>

            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
              <div className="form-group">
                <label>Taxa de Entrega (R$)</label>
                <input type="number" step="0.01" name="deliveryFee" defaultValue={storeSettings.deliveryFee} className="form-input" />
              </div>
              <div className="form-group">
                <label>Pedido Mínimo (R$)</label>
                <input type="number" step="0.01" name="minimumOrderAmount" defaultValue={storeSettings.minimumOrderAmount} className="form-input" />
              </div>
              <div className="form-group">
                <label>Frete Grátis Acima de (R$)</label>
                <input type="number" step="0.01" name="freeDeliveryThreshold" defaultValue={storeSettings.freeDeliveryThreshold || ''} className="form-input" placeholder="Deixe vazio para desativar" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label>Tempo Mínimo de Entrega (min)</label>
                <input type="number" name="estimatedDeliveryTimeMin" defaultValue={storeSettings.estimatedDeliveryTimeMin} className="form-input" />
              </div>
              <div className="form-group">
                <label>Tempo Máximo de Entrega (min)</label>
                <input type="number" name="estimatedDeliveryTimeMax" defaultValue={storeSettings.estimatedDeliveryTimeMax} className="form-input" />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Aviso da Loja (Opcional)</label>
              <input type="text" name="messageOfTheDay" defaultValue={storeSettings.messageOfTheDay || ''} className="form-input" placeholder="Ex: Hoje o tempo de entrega pode ser maior devido a chuvas." />
            </div>
            
          </div>
        </form>
      )}

      {activeTab === 'geral' && (
        <div className="settings-grid" style={{ marginTop: '24px' }}>
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h3>Formas de Pagamento</h3>
            <p className="setting-desc" style={{ marginBottom: '24px' }}>Habilite ou desabilite os métodos aceitos na loja.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {paymentTypes.map(pt => (
                <div key={pt.id} className="setting-item">
                  <div className="setting-info">
                    <span className="setting-title">{pt.name}</span>
                    <span className="setting-desc">{pt.isOnlinePayment ? 'Pagamento online/imediato' : 'Pagamento na entrega'}</span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={pt.isActive} onChange={() => handleTogglePayment(pt.id, pt.isActive)} />
                    <span className="slider"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cupons' && (
        <div className="settings-content glass-panel">
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Desconto</th>
                  <th>Limite de Usos</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(c => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  
                  return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ letterSpacing: '1px' }}>{c.code}</strong>
                        {storeSettings?.activeGlobalCouponCode === c.code && (
                          <span title="Cupom Automático Global" style={{ display: 'inline-flex', padding: '2px 6px', background: 'var(--primary)', color: 'white', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>AUTO</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        {c.discountPercentage ? `${c.discountPercentage}%` : `R$ ${c.discountFixedAmount?.toFixed(2)}`}
                      </span>
                    </td>
                    <td>{c.usageLimit > 0 ? c.usageLimit : 'Ilimitado'}</td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sem validade'}</td>
                    <td>
                      {isExpired ? (
                        <span className="status-badge" style={{ padding: '4px 8px', backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>Expirado</span>
                      ) : c.isActive ? (
                        <span className="status-badge" style={{ padding: '4px 8px' }}>Ativo</span>
                      ) : (
                        <span className="status-badge" style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Inativo</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" title="Editar Cupom" onClick={() => openCouponModal(c)}><Edit2 size={16} /></button>
                        <button 
                          className="btn-icon" 
                          style={{ color: isExpired ? '#94a3b8' : (c.isActive ? '#ef4444' : '#22c55e'), opacity: isExpired ? 0.5 : 1, cursor: isExpired ? 'not-allowed' : 'pointer' }} 
                          title={isExpired ? 'Cupom expirado' : (c.isActive ? 'Desativar' : 'Ativar')}
                          onClick={() => !isExpired && handleToggleCouponStatus(c)}
                          disabled={isExpired}
                        >
                          {c.isActive ? <XCircle size={16} /> : <Check size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum cupom cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '500px', padding: '24px', height: 'fit-content' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
              <button className="btn-icon" onClick={closeCouponModal} type="button"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCouponSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && <div className="form-alert error">{formError}</div>}
              
              <div className="form-group">
                <label>Código do Cupom</label>
                <input 
                  type="text" 
                  name="code" 
                  defaultValue={editingCoupon?.code}
                  className="form-input" 
                  placeholder="EX: PIZZA10"
                  style={{ textTransform: 'uppercase', opacity: editingCoupon ? 0.6 : 1 }}
                  readOnly={!!editingCoupon}
                />
                {editingCoupon && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Não é possível alterar o código após criado.</span>}
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ marginBottom: '8px' }}>Tipo de Desconto</label>
                  <select name="discountType" className="form-input" defaultValue={editingCoupon?.discountFixedAmount ? 'fixed' : 'percentage'}>
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ marginBottom: '8px' }}>Valor / Porcentagem</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="discountValue" 
                    defaultValue={editingCoupon?.discountPercentage || editingCoupon?.discountFixedAmount || ''}
                    className="form-input" 
                    placeholder="10"
                    required
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ marginBottom: '8px' }}>Limite de Usos (0 = Ilimitado)</label>
                  <input 
                    type="number" 
                    name="usageLimit" 
                    defaultValue={editingCoupon?.usageLimit || 0}
                    className="form-input" 
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ marginBottom: '8px' }}>Data de Validade (Opcional)</label>
                  <input 
                    type="datetime-local" 
                    name="expiresAt" 
                    defaultValue={editingCoupon?.expiresAt ? new Date(editingCoupon.expiresAt).toISOString().slice(0, 16) : ''}
                    className="form-input" 
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editingCoupon && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>Cupom Ativo</label>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Habilitar o uso deste cupom na loja</span>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" name="isActive" defaultChecked={editingCoupon?.isActive} />
                      <span className="slider"></span>
                    </label>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255, 87, 34, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 87, 34, 0.2)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: 'var(--primary)' }}>Cupom Automático Global</label>
                    <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', paddingRight: '16px' }}>Aplicado automaticamente no carrinho de todos os clientes</span>
                  </div>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      name="isGlobal" 
                      defaultChecked={editingCoupon ? storeSettings?.activeGlobalCouponCode === editingCoupon.code : false} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }} disabled={loadingForm}>
                {loadingForm ? 'Salvando...' : 'Salvar Cupom'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
