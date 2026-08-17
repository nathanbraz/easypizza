import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, X, Check, XCircle, Image as ImageIcon, Copy } from 'lucide-react';
import { api, getTenantSlugFromUrl } from '../../../lib/api';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import '../Catalog/Catalog.css';
import './Settings.css';
import { formatCurrency } from '../../../utils/formatCurrency';

export default function SettingsManager() {
  const [activeTab, setActiveTab] = useState('geral');
  
  // Estado das Configurações
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Identidade visual (logo e capa do cardápio) — enviadas de imediato pro upload, mas só
  // gravadas nas configurações quando o admin clicar em "Salvar Alterações", igual ao resto do form.
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [bannerUrl, setBannerUrl] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Estado dos Cupons
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
      // Rota autenticada (não a pública do cardápio) — só ela traz os indicadores
      // hasWhatsappApiKey/hasPaymentGatewayAccessToken; as credenciais em si nunca voltam pro navegador.
      const res = await api.get('/settings/admin');
      setStoreSettings(res.data.storeSettings);
      setPaymentTypes(res.data.paymentTypes);
      setLogoUrl(res.data.storeSettings.logoUrl || '');
      setBannerUrl(res.data.storeSettings.bannerUrl || '');
    } catch (error) {
      console.error('Error loading settings', error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogoUrl(response.data.url);
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao enviar a logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBanner(true);
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBannerUrl(response.data.url);
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Erro ao enviar a imagem de capa.');
    } finally {
      setUploadingBanner(false);
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
      ...storeSettings,
      isStoreOpen: formData.get('isStoreOpen') === 'on',
      deliveryFee: parseFloat(formData.get('deliveryFee') as string) || 0,
      minimumOrderAmount: parseFloat(formData.get('minimumOrderAmount') as string) || 0,
      estimatedDeliveryTimeMin: parseInt(formData.get('estimatedDeliveryTimeMin') as string) || 0,
      estimatedDeliveryTimeMax: parseInt(formData.get('estimatedDeliveryTimeMax') as string) || 0,
      freeDeliveryThreshold: formData.get('freeDeliveryThreshold') ? parseFloat(formData.get('freeDeliveryThreshold') as string) : null,
      acceptingPickup: formData.get('acceptingPickup') === 'on',
      acceptingDelivery: formData.get('acceptingDelivery') === 'on',
      messageOfTheDay: formData.get('messageOfTheDay')?.toString() || null,
      activeGlobalCouponCode: formData.get('activeGlobalCouponCode')?.toString() || null,
      logoUrl: logoUrl || null,
      bannerUrl: bannerUrl || null
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

  const handleUpdateWhatsappSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      ...storeSettings,
      whatsappBotEnabled: formData.get('whatsappBotEnabled') === 'on',
      whatsappServerUrl: formData.get('whatsappServerUrl')?.toString() || null,
      whatsappInstanceName: formData.get('whatsappInstanceName')?.toString() || null,
      whatsappApiKey: formData.get('whatsappApiKey')?.toString() || null,
      whatsappSupportPhone: formData.get('whatsappSupportPhone')?.toString() || null,
      whatsappGreetingMessage: formData.get('whatsappGreetingMessage')?.toString() || null
    };

    try {
      setSavingSettings(true);
      await api.put('/settings', payload);
      alert('Configurações do WhatsApp salvas com sucesso!');
      loadSettings();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações do WhatsApp.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePaymentSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Em branco = manter o token já salvo (o backend trata string vazia/nula como "não mudou" —
    // ver SettingsController.UpdateSettings). O campo nunca vem preenchido com o valor real.
    const payload = {
      ...storeSettings,
      paymentGatewayAccessToken: formData.get('paymentGatewayAccessToken')?.toString() || null,
      paymentGatewayWebhookSecret: formData.get('paymentGatewayWebhookSecret')?.toString() || null
    };

    try {
      setSavingSettings(true);
      await api.put('/settings', payload);
      alert('Configurações de pagamento salvas com sucesso!');
      loadSettings();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações de pagamento.');
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

      // Lidar com a configuração de Cupom Global
      const isGlobal = formData.get('isGlobal') === 'on';
      const currentGlobalCode = storeSettings?.activeGlobalCouponCode;
      
      if (isGlobal && currentGlobalCode !== code) {
        // Define este cupom como global
        await api.put('/settings', {
          ...storeSettings,
          activeGlobalCouponCode: code
        });
      } else if (!isGlobal && currentGlobalCode === code) {
        // Remove este cupom do global
        await api.put('/settings', {
          ...storeSettings,
          activeGlobalCouponCode: null
        });
      }

      closeCouponModal();
      loadCoupons();
      loadSettings(); // Recarrega as configurações para atualizar o cupom global
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
          <button className={`tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveTab('whatsapp')}>WhatsApp & Robô</button>
          <button className={`tab-btn ${activeTab === 'pagamentos' ? 'active' : ''}`} onClick={() => setActiveTab('pagamentos')}>Pagamentos</button>
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

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: '0 0 4px' }}>Identidade Visual</h3>
              <p className="setting-desc" style={{ margin: '0 0 16px' }}>Logo e foto de capa exibidas no topo do cardápio do cliente.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Logo (círculo no topo)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} opacity={0.4} />}
                    </div>
                    <label htmlFor="logo-upload" className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 14px' }}>
                      {uploadingLogo ? 'Enviando...' : 'Escolher Arquivo'}
                    </label>
                    <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={uploadingLogo} />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Foto de Capa (topo do cardápio)</label>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ width: '100%', aspectRatio: '16/6', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                      {bannerUrl ? <img src={bannerUrl} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} opacity={0.4} />}
                    </div>
                    <label htmlFor="banner-upload" className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 14px', display: 'inline-block' }}>
                      {uploadingBanner ? 'Enviando...' : 'Escolher Arquivo'}
                    </label>
                    <input id="banner-upload" type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} disabled={uploadingBanner} />
                  </div>
                </div>
              </div>
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

      {activeTab === 'whatsapp' && storeSettings && (
        <form className="settings-grid" onSubmit={handleUpdateWhatsappSettings} style={{ marginTop: '24px' }}>
          {/* Card 1: Status da Conexão */}
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>Status do Robô de WhatsApp</h3>
                <p className="setting-desc" style={{ margin: '4px 0 0 0' }}>Gerencie a conexão de atendimento automático (Evolution API / Z-API)</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span className={`status-badge ${storeSettings.whatsappBotEnabled ? 'status-connected' : 'status-disconnected'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px', backgroundColor: storeSettings.whatsappBotEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: storeSettings.whatsappBotEnabled ? '#22c55e' : '#ef4444', border: `1px solid ${storeSettings.whatsappBotEnabled ? '#22c55e44' : '#ef444444'}` }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: storeSettings.whatsappBotEnabled ? '#22c55e' : '#ef4444' }}></span>
                  {storeSettings.whatsappBotEnabled ? 'Robô Ativo' : 'Robô Desativado'}
                </span>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => alert('Para vincular o número, certifique-se de que a instância do Evolution API está rodando no servidor e clique em OK para gerar o QR Code.')}
                >
                  Conectar / Gerar QR Code
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>Ativar Atendimento Automático</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                  <label className="toggle-switch">
                    <input type="checkbox" name="whatsappBotEnabled" defaultChecked={storeSettings.whatsappBotEnabled} />
                    <span className="slider"></span>
                  </label>
                  <span className="setting-desc">Ligue ou desligue as respostas do robô no número da loja</span>
                </div>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>Número de Suporte (Transbordo Humano)</label>
                <input 
                  type="text" 
                  name="whatsappSupportPhone" 
                  defaultValue={storeSettings.whatsappSupportPhone || ''} 
                  placeholder="Ex: 5511999999999" 
                  className="form-input"
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
                <span className="setting-desc" style={{ marginTop: '6px' }}>Número para o qual o cliente é direcionado se escolher a Opção 2</span>
              </div>
            </div>
          </div>

          {/* Card 2: Mensagens Automáticas */}
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>Mensagem de Boas-Vindas & Cardápio Interativo</h3>
            <p className="setting-desc" style={{ margin: '4px 0 16px 0' }}>Mensagem enviada automaticamente quando o cliente envia um "Oi" ou manda mensagem pela primeira vez.</p>
            
            <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <textarea 
                name="whatsappGreetingMessage" 
                defaultValue={storeSettings.whatsappGreetingMessage || ''} 
                rows={5} 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical', lineHeight: '1.5' }}
                placeholder="Olá! Bem-vindo(a)... Digite 1 para Cardápio ou 2 para Atendente"
              />
            </div>
          </div>

          {/* Card 3: Credenciais e Webhook */}
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>Credenciais do Servidor de Bot & Webhook</h3>
                <p className="setting-desc" style={{ margin: '4px 0 0 0' }}>Configurações técnicas para o motor Evolution API / Z-API</p>
              </div>
              <button type="submit" className="btn-primary" disabled={savingSettings} style={{ padding: '12px 24px', fontWeight: 'bold' }}>
                {savingSettings ? 'Salvando...' : 'Salvar Alterações de WhatsApp'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>URL do Servidor do Robô</label>
                <input 
                  type="text" 
                  name="whatsappServerUrl" 
                  defaultValue={storeSettings.whatsappServerUrl || ''} 
                  placeholder="Ex: http://localhost:8080 ou https://bot.suaempresa.com" 
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>Nome da Instância / ID da Loja</label>
                <input 
                  type="text" 
                  name="whatsappInstanceName" 
                  defaultValue={storeSettings.whatsappInstanceName || ''} 
                  placeholder="Ex: pizzariabrazil" 
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>API Key / Token de Segurança</label>
                <input
                  type="password"
                  name="whatsappApiKey"
                  placeholder={storeSettings.hasWhatsappApiKey ? '•••••••• (já configurada — deixe em branco pra manter)' : 'Cole sua API Key do Evolution ou Z-API aqui'}
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '28px', padding: '18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.2)' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL do Webhook do EasyPizza (Somente Leitura)</label>
              <p className="setting-desc" style={{ margin: '6px 0 14px 0', fontSize: '13px' }}>Configure esta URL no seu painel ou motor de WhatsApp para que o sistema receba mensagens automaticamente.</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  readOnly 
                  value="http://localhost:5000/api/webhook/whatsapp/pizzariabrazil" 
                  style={{ flex: 1, minWidth: '250px', padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}
                />
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ whiteSpace: 'nowrap', padding: '12px 18px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => {
                    navigator.clipboard.writeText('http://localhost:5000/api/webhook/whatsapp/pizzariabrazil');
                    alert('URL do Webhook copiada com sucesso para a área de transferência!');
                  }}
                >
                  Copiar Link
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'pagamentos' && storeSettings && (
        <form className="settings-grid" onSubmit={handleUpdatePaymentSettings} style={{ marginTop: '24px' }}>
          <div className="settings-card glass-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>Mercado Pago (Pix)</h3>
                <p className="setting-desc" style={{ margin: '4px 0 0 0' }}>Credencial usada para gerar cobranças Pix (QR code / copia-e-cola) e confirmar pagamentos automaticamente.</p>
              </div>
              <button type="submit" className="btn-primary" disabled={savingSettings} style={{ padding: '12px 24px', fontWeight: 'bold' }}>
                {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>Access Token</label>
                <input
                  type="password"
                  name="paymentGatewayAccessToken"
                  placeholder={storeSettings.hasPaymentGatewayAccessToken ? '•••••••• (já configurado — deixe em branco pra manter)' : 'Cole aqui o Access Token (TEST-... ou APP_USR-...)'}
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
                <span className="setting-desc" style={{ marginTop: '6px' }}>
                  {storeSettings.hasPaymentGatewayAccessToken
                    ? `Configurado (${storeSettings.paymentGatewayProvider === 'MercadoPago' ? 'Mercado Pago' : storeSettings.paymentGatewayProvider || 'gateway'}). Só é possível trocá-lo, não visualizá-lo novamente.`
                    : 'Encontrado em developers.mercadopago.com.br, na aplicação da loja, aba Credenciais.'}
                </span>
              </div>

              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontWeight: '600', color: '#e2e8f0' }}>Chave Secreta do Webhook</label>
                <input
                  type="password"
                  name="paymentGatewayWebhookSecret"
                  placeholder={storeSettings.hasPaymentGatewayWebhookSecret ? '•••••••• (já configurada — deixe em branco pra manter)' : 'Cole aqui a Chave secreta em Webhooks'}
                  style={{ marginTop: '8px', width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                />
                <span className="setting-desc" style={{ marginTop: '6px' }}>
                  Usada para confirmar que a notificação de pagamento realmente veio do Mercado Pago. Sem ela, nenhuma confirmação automática é aceita.
                </span>
              </div>
            </div>

            <div style={{ marginTop: '28px', padding: '18px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px dashed rgba(255, 255, 255, 0.2)' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL de Notificação (Somente Leitura)</label>
              <p className="setting-desc" style={{ margin: '6px 0 14px 0', fontSize: '13px' }}>Cole essa URL em "Suas integrações" &gt; sua aplicação &gt; Webhooks &gt; Configurar notificações, selecionando o evento "Order".</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  readOnly
                  value={`http://localhost:5000/api/webhook/mercadopago/${getTenantSlugFromUrl()}`}
                  style={{ flex: 1, minWidth: '250px', padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', padding: '12px 18px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => {
                    navigator.clipboard.writeText(`http://localhost:5000/api/webhook/mercadopago/${getTenantSlugFromUrl()}`);
                    alert('URL de notificação copiada com sucesso para a área de transferência!');
                  }}
                >
                  <Copy size={15} /> Copiar Link
                </button>
              </div>
            </div>
          </div>
        </form>
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
                  <th>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '0.5rem' }}>Ações</div>
                  </th>
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
                        {c.discountPercentage ? `${c.discountPercentage}%` : `R$ ${formatCurrency(c.discountFixedAmount)}`}
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
