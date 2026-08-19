import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, ChefHat, Bike, FileCheck, AlertCircle, RefreshCw, XCircle, RotateCcw, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, getTenantSlugFromUrl } from '../../lib/api';
import PixStatusIcon from '../../components/PixStatusIcon';
import './OrderTrackerPage.css';
import { formatCurrency } from '../../utils/formatCurrency';

export default function OrderTrackerPage() {
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams<{ orderId?: string }>();
  
  const [activeTab, setActiveTab] = useState<'tracker' | 'history'>('tracker');
  const [order, setOrder] = useState<any | null>(null);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // "Quer pedir de novo?" — mesmo dado que a MenuPage já grava no localStorage ao carregar a sessão.
  const [customerInfo] = useState<any | null>(() => {
    const saved = localStorage.getItem('@EasyPizza:CustomerInfo');
    return saved ? JSON.parse(saved) : null;
  });

  const tenantSlug = getTenantSlugFromUrl();

  const getActiveOrderId = () => {
    if (paramOrderId) return paramOrderId;
    return localStorage.getItem('@EasyPizza:LastOrderId');
  };

  const getCustomerId = () => {
    const savedInfo = localStorage.getItem('@EasyPizza:CustomerInfo');
    if (savedInfo) {
      const parsed = JSON.parse(savedInfo);
      if (parsed.customerId) return parsed.customerId;
    }
    return localStorage.getItem('@EasyPizza:CustomerId');
  };

  const fetchOrderDetails = async (id: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get(`/orders/${tenantSlug}/${id}`);
      const data = res.data.data || res.data;
      setOrder(data);
    } catch (err) {
      console.error("Erro ao buscar detalhes do pedido:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const fetchCustomerHistory = async () => {
    const customerId = getCustomerId();
    if (!customerId) return;
    try {
      const res = await api.get(`/orders/${tenantSlug}/customer/${customerId}`);
      const data = res.data.data || res.data;
      if (Array.isArray(data)) {
        setHistoryOrders(data);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico de pedidos:", err);
    }
  };

  useEffect(() => {
    const id = getActiveOrderId();
    if (id) {
      fetchOrderDetails(id);
    } else {
      setLoading(false);
    }
    fetchCustomerHistory();
  }, [paramOrderId]);

  // Polling ágil em tempo real a cada 2.5 segundos para resposta quase instantânea na tela do cliente
  useEffect(() => {
    const id = getActiveOrderId();

    const interval = setInterval(() => {
      if (id) fetchOrderDetails(id);
      fetchCustomerHistory();
    }, 2500);

    return () => clearInterval(interval);
  }, [activeTab, paramOrderId]);

  const steps = [
    { id: 1, title: 'Pedido Recebido', icon: <FileCheck size={24} />, description: 'A pizzaria recebeu e está analisando seu pedido' },
    { id: 2, title: 'Preparando', icon: <ChefHat size={24} />, description: 'Sua pizza está sendo montada e assada' },
    { id: 3, title: 'Saiu para Entrega / Prontidão', icon: <Bike size={24} />, description: 'A caminho do endereço ou pronto para retirada' },
    { id: 4, title: 'Concluído', icon: <CheckCircle size={24} />, description: 'Pedido entregue com sucesso. Bom apetite!' },
  ];

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 1: return 'Recebido';
      case 2: return 'Preparando';
      case 3: return 'Em Entrega / Prontidão';
      case 4: return 'Concluído';
      case 5: return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const currentStatus = order ? Number(order.status) : 1;

  return (
    <div className="tracker-page">
      <header className="tracker-header glass-panel">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={24} color="var(--primary)" />
        </button>
        <div className="tracker-header-info" style={{ flex: 1 }}>
          <h1>Acompanhar Pedido</h1>
          {order && <span className="order-number">#{order.id}</span>}
        </div>
        <button 
          className="back-btn" 
          onClick={() => {
            const id = getActiveOrderId();
            if (id) fetchOrderDetails(id, true);
            fetchCustomerHistory();
          }}
          title="Atualizar Status"
          style={{ transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}
        >
          <RefreshCw size={20} color="var(--primary)" />
        </button>
      </header>

      <main className="tracker-content">
        {customerInfo?.lastOrderSummary && (
          <div className="reorder-card glass-panel animate-slide-up">
            <div className="reorder-card-left">
              <div className="reorder-icon-wrapper">
                <RotateCcw size={20} />
              </div>
              <div className="reorder-info">
                <h3>Quer pedir de novo? 🍕</h3>
                <p>{customerInfo.lastOrderSummary}</p>
              </div>
            </div>
            <button
              className="reorder-action-btn"
              onClick={() => navigate(customerInfo.lastOrderId ? `/tracker/${customerInfo.lastOrderId}` : '/tracker')}
            >
              Pedir Novamente
            </button>
          </div>
        )}

        <div className="tracker-tabs">
          <button 
            className={`tracker-tab ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            Pedido Atual
          </button>
          <button 
            className={`tracker-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              fetchCustomerHistory();
            }}
          >
            Meus Pedidos Anteriores ({historyOrders.length})
          </button>
        </div>

        {activeTab === 'tracker' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div className="global-spinner" />
                Carregando informações do pedido...
              </div>
            ) : !order ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
                <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px auto' }} />
                <h3>Nenhum Pedido Selecionado</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Você ainda não possui um pedido recente ativo ou não selecionou nenhum do histórico.
                </p>
                <button className="primary-button" onClick={() => navigate('/')} style={{ width: '100%' }}>
                  Acessar Cardápio
                </button>
              </div>
            ) : (
              <>
                {currentStatus === 1 && (
                  <div className="approval-banner animate-slide-up">
                    <AlertCircle size={32} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <div className="approval-banner-info">
                      <h3>Pedido Feito e Aguardando Aprovação</h3>
                      <p>Recebemos seu pedido! Assim que a pizzaria aprovar no balcão, o preparo será iniciado imediatamente.</p>
                    </div>
                  </div>
                )}

                {currentStatus === 5 && (
                  <div className="cancelled-banner animate-slide-up">
                    <XCircle size={32} color="#ef4444" style={{ flexShrink: 0 }} />
                    <div className="approval-banner-info">
                      <h3 style={{ color: '#ef4444' }}>Pedido Cancelado</h3>
                      <p>Infelizmente este pedido foi cancelado pela loja. Entre em contato pelo WhatsApp para mais informações.</p>
                    </div>
                  </div>
                )}

                {order.paymentType?.isOnlinePayment && (order.isPaid || order.pixCopyPasteCode) && (
                  <div className={`pix-payment-card glass-panel animate-slide-up ${order.isPaid ? 'is-paid' : ''}`}>
                    <div className="pix-payment-header">
                      <PixStatusIcon status={order.isPaid ? 'confirmed' : 'waiting'} size={48} />
                      <div>
                        <h3>{order.isPaid ? 'Pagamento Aprovado' : 'Pague com Pix para confirmar seu pedido'}</h3>
                        <p>
                          {order.isPaid
                            ? 'Recebemos a confirmação do seu pagamento via Pix. Seu pedido já está sendo preparado!'
                            : 'Escaneie o QR code ou copie o código abaixo no app do seu banco. A confirmação é automática, não precisa recarregar a página.'}
                        </p>
                      </div>
                    </div>

                    {!order.isPaid && (
                      <>
                        <div className="pix-qr-wrapper">
                          <QRCodeSVG value={order.pixCopyPasteCode} size={180} />
                        </div>

                        <div className="pix-copy-row">
                          <input type="text" readOnly value={order.pixCopyPasteCode} className="pix-copy-input" />
                          <button
                            type="button"
                            className="pix-copy-btn"
                            onClick={() => {
                              navigator.clipboard.writeText(order.pixCopyPasteCode);
                              setPixCopied(true);
                              setTimeout(() => setPixCopied(false), 2500);
                            }}
                          >
                            {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                            {pixCopied ? 'Copiado!' : 'Copiar código'}
                          </button>
                        </div>

                        <div className="pix-waiting-indicator">
                          Aguardando confirmação do pagamento...
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="eta-card glass-panel animate-fade-in">
                  <Clock size={32} color="var(--primary)" />
                  <div className="eta-info" style={{ flex: 1 }}>
                    <span className="eta-label">Valor Total do Pedido</span>
                    <span className="eta-time">R$ {formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="eta-label">Tipo</span>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                      {order.type === 1 ? '🚚 Delivery' : '🏪 Retirada'}
                    </div>
                  </div>
                </div>

                <div className="stepper-container">
                  {steps.map((step) => {
                    const isCompleted = currentStatus > step.id && currentStatus !== 5;
                    const isActive = currentStatus === step.id;
                    
                    return (
                      <div key={step.id} className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                        <div className="step-icon-wrapper">
                          <div className="step-line" />
                          <div className="step-icon">
                            {step.icon}
                          </div>
                        </div>
                        <div className="step-content">
                          <h3>{step.title}</h3>
                          <p>{step.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', marginTop: '24px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#fff' }}>Resumo do Pedido</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {order.items.map((it: any) => (
                        <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {/* Linha principal do item */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: '#fff', fontWeight: 600 }}>
                              {it.quantity}x {it.product?.name || 'Item'}
                            </span>
                            <span style={{ color: '#fff', fontWeight: 700 }}>
                              R$ {formatCurrency(it.quantity * it.unitPrice)}
                            </span>
                          </div>
                          {/* Opções/Adicionais */}
                          {it.addons && it.addons.length > 0 && it.addons.map((addon: any, aIdx: number) => (
                            <div key={aIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingLeft: '12px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                ↳ {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.addonName}
                              </span>
                              {Number(addon.price) > 0 && (
                                <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                                  +R$ {formatCurrency(addon.price)}
                                </span>
                              )}
                            </div>
                          ))}
                          {/* Observação */}
                          {it.notes && (
                            <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#f59e0b', paddingLeft: '12px' }}>
                              📝 {it.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Resumo financeiro */}
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Number(order.deliveryFee) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <span>Taxa de Entrega</span>
                          <span>R$ {formatCurrency(order.deliveryFee)}</span>
                        </div>
                      )}
                      {Number(order.discountAmount) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#22c55e' }}>
                          <span>Desconto {order.couponCode ? `(${order.couponCode})` : ''}</span>
                          <span>-R$ {formatCurrency(order.discountAmount)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: 'var(--primary)', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span>Total</span>
                        <span>R$ {formatCurrency(order.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {(currentStatus === 4 || currentStatus === 5) && (
                  <div className="feedback-section animate-fade-in">
                     <button className="reorder-btn" onClick={() => navigate('/')}>Fazer Novo Pedido</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="history-list animate-fade-in">
            {historyOrders.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Nenhum pedido anterior encontrado no histórico.</p>
              </div>
            ) : (
              historyOrders.map((ord: any) => (
                <div key={ord.id} className="history-card">
                  <div className="history-info">
                    <h4>
                      Pedido #{ord.id}
                      <span className={`history-badge status-${ord.status}`}>
                        {getStatusLabel(Number(ord.status))}
                      </span>
                    </h4>
                    <p>{new Date(ord.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} &bull; R$ {formatCurrency(ord.totalAmount)}</p>
                  </div>
                  <button 
                    className="history-action-btn"
                    onClick={() => {
                      navigate(`/tracker/${ord.id}`);
                      setActiveTab('tracker');
                    }}
                  >
                    Acompanhar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
