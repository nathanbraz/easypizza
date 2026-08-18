import { useState, useEffect } from 'react';
import { RefreshCw, X, User, MapPin, CreditCard, ShoppingBag, Eye, Printer, Inbox, ChevronDown, Phone, Clock, DollarSign, Ban, AlertTriangle } from 'lucide-react';
import { api, getTenantSlugFromUrl } from '../../../lib/api';
import './Orders.css';

type ColumnStatus = 'new' | 'preparing' | 'delivering' | 'done';

const STATUS_BY_COLUMN: Record<ColumnStatus, number> = {
  new: 1,
  preparing: 2,
  delivering: 3,
  done: 4,
};

const STATUS_ACCENT: Record<ColumnStatus, string> = {
  new: '#fb923c',
  preparing: '#60a5fa',
  delivering: '#22d3ee',
  done: '#4ade80',
};

interface OrderItem {
  id?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  product?: {
    name: string;
  };
  addons?: {
    addonName: string;
    price: number;
    quantity?: number;
  }[];
}

interface Order {
  id: string | number;
  createdAt: string;
  status: number | string;
  type?: number | string;
  totalAmount?: number;
  subTotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  couponCode?: string;
  customer?: {
    name?: string;
    phoneNumber?: string;
    PhoneNumber?: string;
  };
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    complement?: string;
    city?: string;
  };
  paymentType?: {
    name?: string;
  };
  changeFor?: number;
  isPaid?: boolean;
  items?: OrderItem[];
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | number | null>(null);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [sortDirections, setSortDirections] = useState<Record<ColumnStatus, 'asc' | 'desc'>>({
    new: 'asc',
    preparing: 'asc',
    delivering: 'asc',
    done: 'asc',
  });

  // Fecha o menu "Ações" ao clicar fora dele
  useEffect(() => {
    if (openMenuOrderId === null) return;
    const closeMenu = () => setOpenMenuOrderId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuOrderId]);

  const fetchOrders = async () => {
    try {
      const slug = getTenantSlugFromUrl();
      const res = await api.get(`/orders/admin/${slug}`);
      const data = res.data.data || res.data || [];
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 2500);
    return () => clearInterval(interval);
  }, []);

  const getColumnForStatus = (status: number | string): ColumnStatus | 'canceled' | null => {
    if (status === 1 || status === 'New' || status === 'new') return 'new';
    if (status === 2 || status === 'Preparing' || status === 'preparing') return 'preparing';
    if (status === 3 || status === 'Delivering' || status === 'delivering') return 'delivering';
    if (status === 4 || status === 'Completed' || status === 'completed' || status === 'done') return 'done';
    if (status === 5 || status === 'Canceled' || status === 'canceled') return 'canceled';
    return null;
  };

  const getOrdersByColumn = (colId: ColumnStatus) => {
    const direction = sortDirections[colId];
    return orders
      .filter(o => getColumnForStatus(o.status) === colId)
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return direction === 'asc' ? diff : -diff;
      });
  };

  const moveOrder = async (orderId: string | number, nextStatus: number) => {
    const order = orders.find(o => String(o.id) === String(orderId));
    if (order && order.status === nextStatus) return; // Já está neste status

    // Atualização otimista na interface
    setOrders(prev => prev.map(o => String(o.id) === String(orderId) ? { ...o, status: nextStatus } : o));
    try {
      const slug = getTenantSlugFromUrl();
      await api.patch(`/orders/admin/${slug}/${orderId}/status`, { status: nextStatus });
      fetchOrders();
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      fetchOrders();
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelingOrder || !cancelReason.trim()) return;

    setCancelSubmitting(true);
    try {
      const slug = getTenantSlugFromUrl();
      await api.patch(`/orders/admin/${slug}/${cancelingOrder.id}/cancel`, { reason: cancelReason.trim() });
      setCancelingOrder(null);
      setCancelReason('');
      fetchOrders();
    } catch (error) {
      console.error("Erro ao cancelar pedido:", error);
      alert('Erro ao cancelar o pedido. Tente novamente.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getElapsedLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `Há ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `Há ${hours}h${remainder > 0 ? ` ${remainder}m` : ''}`;
  };

  const getItemsSummary = (order: Order) => {
    if (!order.items || order.items.length === 0) return 'Sem itens registrados';
    return order.items.map(i => `${i.quantity}x ${i.product?.name || 'Item'}`).join('\n');
  };

  const formatId = (id: string | number) => {
    if (String(id).startsWith('#')) return String(id);
    return '#' + id;
  };

  const formatPhone = (phone: string | undefined) => {
    if (!phone) return 'Não informado';
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('55') && cleaned.length > 11) cleaned = cleaned.substring(2);
    if (cleaned.length === 11) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
  };

  const formatCurrency = (val: string | number | undefined | null) => {
    if (val === null || val === undefined) return '0,00';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const printOrderTicket = (order: Order) => {
    const isPickup = Number(order.type) === 2 || order.type === 'Pickup';
    const createdAtStr = new Date(order.createdAt).toLocaleString('pt-BR');
    const customerPhone = formatPhone(order.customer?.phoneNumber || order.customer?.PhoneNumber);
    
    let addressHtml = '<div class="text-center bold" style="margin: 4px 0;">RETIRADA NO BALCÃO</div>';
    if (!isPickup && order.address) {
      let street = order.address.street || '';
      if (street.match(/^\d+\.\s/)) street = street.replace(/^\d+\.\s/, '');

      let compLine = '';
      if (order.address.complement) {
         if (order.address.complement.startsWith('Ref:')) {
            compLine = `<div>${order.address.complement}</div>`;
         } else {
            compLine = `<div>Compl: ${order.address.complement}</div>`;
         }
      }

      addressHtml = `
        <div class="bold" style="margin-top: 4px;">ENTREGA EM DOMICÍLIO:</div>
        <div>${street}, nº ${order.address.number || 'S/N'}</div>
        ${compLine}
        <div>Bairro: ${order.address.neighborhood || ''}</div>
        <div>Cidade: ${order.address.city || ''}</div>
      `;
    }

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const itemTotal = formatCurrency(item.quantity * Number(item.unitPrice || 0));
        const addonsHtml = item.addons && item.addons.length > 0
          ? item.addons.map(a => {
              const qty = a.quantity && a.quantity > 1 ? `${a.quantity}x ` : '';
              const priceText = Number(a.price) > 0 ? `+R$ ${formatCurrency(a.price)}` : '';
              return `<tr><td></td><td style="font-size:11px;color:#555;display:flex;justify-content:space-between;"><span>  ↳ ${qty}${a.addonName}</span><span>${priceText}</span></td><td></td></tr>`;
            }).join('')
          : '';
        const notesHtml = item.notes
          ? `<tr><td></td><td style="font-size:10px;font-style:italic;color:#777;">  📝 Obs: ${item.notes}</td><td></td></tr>`
          : '';
        itemsHtml += `
          <tr>
            <td class="item-qty">${item.quantity}x</td>
            <td>${item.product?.name || 'Item'}</td>
            <td class="item-price">R$ ${itemTotal}</td>
          </tr>
          ${addonsHtml}
          ${notesHtml}
        `;
      });
    } else {
      itemsHtml = '<tr><td colspan="3" class="text-center">Nenhum item</td></tr>';
    }

    const subTotal = formatCurrency(order.subTotal || 0);
    const deliveryFee = formatCurrency(order.deliveryFee || 0);
    const discount = formatCurrency(order.discountAmount || 0);
    const total = formatCurrency(order.totalAmount ?? order.subTotal ?? 0);

    const ticketHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Imprimir Pedido #${order.id}</title>
        <style>
          @page {
            margin: 4mm;
            size: auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            max-width: 76mm;
            margin: 0 auto;
            padding: 2mm;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.3;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .title { font-size: 16px; font-weight: bold; }
          .subtitle { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 4px 0; }
          td { vertical-align: top; padding: 2px 0; font-size: 12px; }
          .item-qty { width: 25px; font-weight: bold; }
          .item-price { text-align: right; width: 70px; font-weight: bold; }
          .summary-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
          .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="text-center title">EASYPIZZA</div>
        <div class="text-center subtitle" style="margin-top: 2px;">PEDIDO #${order.id}</div>
        <div class="text-center" style="font-size: 11px; margin-top: 2px;">Data: ${createdAtStr}</div>
        
        <div class="divider"></div>
        ${addressHtml}
        
        <div class="divider"></div>
        <div class="bold">CLIENTE:</div>
        <div>Nome: ${order.customer?.name || 'Cliente'}</div>
        <div>Tel: ${customerPhone}</div>
        
        <div class="divider"></div>
        <div class="bold" style="margin-bottom: 4px;">ITENS DO PEDIDO:</div>
        <table>
          ${itemsHtml}
        </table>
        
        <div class="divider"></div>
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>R$ ${subTotal}</span>
        </div>
        <div class="summary-row">
          <span>Taxa Entrega:</span>
          <span>R$ ${deliveryFee}</span>
        </div>
        ${Number(order.discountAmount) > 0 ? `
          <div class="summary-row">
            <span>Desconto:</span>
            <span>- R$ ${discount}</span>
          </div>
        ` : ''}
        <div class="total-row">
          <span>TOTAL A PAGAR:</span>
          <span>R$ ${total}</span>
        </div>
        
        <div class="divider"></div>
        <div class="bold">PAGAMENTO:</div>
        <div>Forma: ${order.paymentType?.name?.toUpperCase() || 'NÃO INFORMADO'}</div>
        ${order.changeFor ? `<div>Troco para: R$ ${formatCurrency(order.changeFor)}</div>` : ''}
        
        <div class="divider"></div>
        <div class="text-center" style="margin-top: 8px; font-size: 11px;">*** OBRIGADO PELA PREFERÊNCIA! ***</div>
        <div class="text-center" style="font-size: 10px; margin-top: 2px;">Sistema EasyPizza</div>
        <div style="height: 4mm;"></div>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800,left=150,top=80');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(ticketHtml);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 300);
    }
  };

  const columns: { id: ColumnStatus; title: string; color: string }[] = [
    { id: 'new', title: 'Novos', color: '#f97316' },
    { id: 'preparing', title: 'Preparando', color: '#3b82f6' },
    { id: 'delivering', title: 'Em Entrega', color: '#06b6d4' },
    { id: 'done', title: 'Finalizados', color: '#22c55e' }
  ];

  return (
    <div className="orders-kds animate-fade-in">
      <header className="kds-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1>Pedidos</h1>
          {loading && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Carregando...</span>}
        </div>
        <button 
          onClick={() => { setLoading(true); fetchOrders(); }} 
          className="btn-icon" 
          title="Atualizar Pedidos"
          style={{ border: '1px solid var(--border-color)', padding: '6px 12px', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar</span>
        </button>
      </header>
      
      <div className="kds-kanban">
        {columns.map(col => {
          const colOrders = getOrdersByColumn(col.id);
          return (
            <div 
              key={col.id} 
              className="kanban-column glass-panel"
              style={{ 
                borderTop: `3px solid ${col.color}`, 
                boxShadow: `0 -4px 20px -10px ${col.color}`,
                '--col-color': col.color 
              } as React.CSSProperties}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('drag-over');
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  e.currentTarget.classList.remove('drag-over');
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                const orderId = e.dataTransfer.getData('text/plain');
                if (orderId) {
                  moveOrder(orderId, STATUS_BY_COLUMN[col.id]);
                }
              }}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className="kanban-dot" style={{ backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}` }}></span>
                  <h3>{col.title}</h3>
                  <span className="kanban-badge" style={{ backgroundColor: `${col.color}20`, color: col.color, border: `1px solid ${col.color}40` }}>{colOrders.length}</span>
                </div>
                <select
                  className="kanban-sort-select"
                  value={sortDirections[col.id]}
                  onChange={(e) => setSortDirections(prev => ({ ...prev, [col.id]: e.target.value as 'asc' | 'desc' }))}
                  title="Ordenar pedidos desta coluna"
                >
                  <option value="asc">Mais antigos</option>
                  <option value="desc">Mais recentes</option>
                </select>
              </div>
              <div className="kanban-cards">
                {colOrders.length === 0 ? (
                  <div className="empty-column">
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${col.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col.color, opacity: 0.7 }}>
                      <Inbox size={18} />
                    </div>
                    <span>Nenhum pedido nesta etapa</span>
                  </div>
                ) : (
                  colOrders.map(order => (
                      <div 
                        key={order.id} 
                        className="order-card animate-scale-up"
                        style={{ '--col-color': col.color } as React.CSSProperties}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(order.id));
                        e.currentTarget.classList.add('dragging');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('dragging');
                      }}
                    >
                      <div className="order-card-header">
                        <div className="order-id-time">
                          <span className="order-id">{formatId(order.id)}</span>
                          <span className="order-time-dot">·</span>
                          <Clock size={11} />
                          <span className="order-time" title={formatTime(order.createdAt)}>{getElapsedLabel(order.createdAt)}</span>
                        </div>
                        <div className="order-actions-menu">
                          <button
                            className="btn-actions-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuOrderId(openMenuOrderId === order.id ? null : order.id);
                            }}
                          >
                            + Ações <ChevronDown size={13} />
                          </button>
                          {openMenuOrderId === order.id && (
                            <div className="actions-dropdown" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setSelectedOrder(order); setOpenMenuOrderId(null); }}>
                                <Eye size={14} /> Ver Detalhes
                              </button>
                              <button onClick={() => { printOrderTicket(order); setOpenMenuOrderId(null); }}>
                                <Printer size={14} /> Imprimir Cupom
                              </button>
                              <button
                                className="action-danger"
                                onClick={() => { setCancelingOrder(order); setCancelReason(''); setOpenMenuOrderId(null); }}
                              >
                                <Ban size={14} /> Cancelar Pedido
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="order-card-body">
                        <div className="order-customer-row">
                          <span className="order-customer">{order.customer?.name || 'Cliente'}</span>
                          <span className={`payment-badge ${order.isPaid ? 'paid' : 'pending'}`}>
                            {order.isPaid ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                        <div className="order-payment-row">
                          <span className="order-payment-method">
                            <CreditCard size={11} />
                            {order.paymentType?.name || 'Não informado'}
                          </span>
                          <span className="order-total">R$ {formatCurrency(order.totalAmount ?? order.subTotal ?? 0)}</span>
                        </div>
                        <div className="order-phone">
                          <Phone size={11} />
                          {formatPhone(order.customer?.phoneNumber || order.customer?.PhoneNumber)}
                        </div>
                        <div className="order-address">
                          <MapPin size={11} />
                          <span>
                            {Number(order.type) === 2 || order.type === 'Pickup'
                              ? 'Retirada no balcão'
                              : order.address
                                ? `${order.address.neighborhood ? order.address.neighborhood + ' - ' : ''}${order.address.street || 'Endereço não informado'}`
                                : 'Endereço não informado'}
                          </span>
                        </div>
                        <div className="order-items" style={{ whiteSpace: 'pre-line' }}>{getItemsSummary(order)}</div>
                      </div>
                      <div className="order-footer">
                        <div className="order-status-wrapper">
                          <select
                            className={`order-status-select status-${col.id}`}
                            value={STATUS_BY_COLUMN[col.id]}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => moveOrder(order.id, Number(e.target.value))}
                          >
                            <option value={1}>Novo</option>
                            <option value={2}>Preparando</option>
                            <option value={3}>Em Entrega</option>
                            <option value={4}>Finalizado</option>
                          </select>
                          <ChevronDown size={12} className="order-status-chevron" style={{ color: STATUS_ACCENT[col.id] }} />
                        </div>
                        <div className="order-footer-actions">
                          <button className="btn-icon-footer" onClick={(e) => { e.stopPropagation(); printOrderTicket(order); }} title="Imprimir Cupom">
                            <Printer size={15} />
                          </button>
                          <button className="btn-icon-footer disabled" onClick={(e) => e.stopPropagation()} title="Em breve">
                            <DollarSign size={15} />
                          </button>
                          <button className="btn-icon-footer" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} title="Ver Detalhes">
                            <Eye size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedOrder && (
        <div className="order-details-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="order-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-details-header">
              <h2>
                <span>Pedido #{selectedOrder.id}</span>
                <span className="kanban-badge" style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(249, 115, 22, 0.2)', color: 'var(--primary)' }}>
                  {getColumnForStatus(selectedOrder.status)?.toUpperCase() || 'STATUS'}
                </span>
              </h2>
              <button className="btn-icon" onClick={() => setSelectedOrder(null)} title="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="order-details-body">
              {/* Cliente */}
              <div className="order-detail-section">
                <h4><User size={14} /> Dados do Cliente</h4>
                <div className="order-detail-row">
                  <span>Nome:</span>
                  <strong>{selectedOrder.customer?.name || 'Cliente'}</strong>
                </div>
                <div className="order-detail-row">
                  <span>Telefone:</span>
                  <strong>{selectedOrder.customer?.phoneNumber || selectedOrder.customer?.PhoneNumber || 'Não informado'}</strong>
                </div>
              </div>

              {/* Endereço / Tipo */}
              <div className="order-detail-section">
                <h4><MapPin size={14} /> Endereço & Entrega</h4>
                <div className="order-detail-row">
                  <span>Tipo:</span>
                  <strong>{Number(selectedOrder.type) === 2 || selectedOrder.type === 'Pickup' ? 'Retirada no Balcão' : 'Entrega no Endereço'}</strong>
                </div>
                {Number(selectedOrder.type) !== 2 && selectedOrder.type !== 'Pickup' && selectedOrder.address && (
                  <div className="order-detail-row" style={{ flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    <span>Endereço:</span>
                    <strong>
                      {selectedOrder.address.street || 'Rua não informada'}, nº {selectedOrder.address.number || 'S/N'}
                      {selectedOrder.address.complement ? ` (${selectedOrder.address.complement})` : ''} - {selectedOrder.address.neighborhood || ''} - {selectedOrder.address.city || ''}
                    </strong>
                  </div>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div className="order-detail-section">
                <h4><CreditCard size={14} /> Pagamento</h4>
                <div className="order-detail-row">
                  <span>Forma escolhida:</span>
                  <strong>{selectedOrder.paymentType?.name || 'Não informado'}</strong>
                </div>
              </div>

              {/* Itens */}
              <div className="order-detail-section">
                <h4><ShoppingBag size={14} /> Itens do Pedido ({selectedOrder.items?.length || 0})</h4>
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Qtd</th>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, idx) => (
                        <>
                          <tr key={idx}>
                            <td><strong>{item.quantity}x</strong></td>
                            <td><strong>{item.product?.name || 'Item'}</strong></td>
                            <td style={{ textAlign: 'right' }}>R$ {formatCurrency(item.quantity * Number(item.unitPrice || 0))}</td>
                          </tr>
                          {/* Opções/Adicionais do item */}
                          {item.addons && item.addons.map((addon, aIdx) => (
                            <tr key={`addon-${idx}-${aIdx}`} style={{ opacity: 0.8 }}>
                              <td></td>
                              <td style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '12px' }}>
                                ↳ {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.addonName}
                                {Number(addon.price) > 0 && <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>+R$ {formatCurrency(addon.price)}</span>}
                              </td>
                              <td></td>
                            </tr>
                          ))}
                          {/* Observação do item */}
                          {item.notes && (
                            <tr key={`note-${idx}`}>
                              <td></td>
                              <td colSpan={2} style={{ fontSize: '11px', fontStyle: 'italic', color: '#f59e0b', paddingLeft: '12px' }}>
                                📝 {item.notes}
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#71717a' }}>Nenhum item registrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro */}
              <div className="order-detail-section" style={{ backgroundColor: 'rgba(249, 115, 22, 0.05)', borderColor: 'rgba(249, 115, 22, 0.15)' }}>
                <div className="order-detail-row">
                  <span>Subtotal:</span>
                  <span>R$ {formatCurrency(selectedOrder.subTotal || 0)}</span>
                </div>
                <div className="order-detail-row">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {formatCurrency(selectedOrder.deliveryFee || 0)}</span>
                </div>
                {Number(selectedOrder.discountAmount) > 0 && (
                  <div className="order-detail-row" style={{ color: '#22c55e' }}>
                    <span>Desconto {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:</span>
                    <span>- R$ {formatCurrency(selectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="order-detail-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '15px' }}>
                  <strong style={{ color: 'var(--primary, #f97316)' }}>Total do Pedido:</strong>
                  <strong style={{ color: 'var(--primary, #f97316)', fontSize: '16px' }}>R$ {formatCurrency(selectedOrder.totalAmount ?? selectedOrder.subTotal ?? 0)}</strong>
                </div>
              </div>
            </div>

            <div className="order-details-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="btn-action" 
                onClick={() => printOrderTicket(selectedOrder)} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
              >
                <Printer size={15} /> Imprimir Cupom (80mm)
              </button>
              <button className="btn-close-modal" onClick={() => setSelectedOrder(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelingOrder && (
        <div className="order-details-modal-overlay" onClick={() => !cancelSubmitting && setCancelingOrder(null)}>
          <div className="order-details-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="order-details-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <AlertTriangle size={18} /> Cancelar Pedido #{cancelingOrder.id}
              </h2>
              <button className="btn-icon" onClick={() => setCancelingOrder(null)} title="Fechar" disabled={cancelSubmitting}>
                <X size={20} />
              </button>
            </div>

            <div className="order-details-body">
              <p style={{ color: 'var(--text-secondary, #cbd5e1)', fontSize: '13px', marginBottom: '14px' }}>
                O cliente será avisado do cancelamento pelo WhatsApp (se o robô estiver ativo). Essa ação não pode ser desfeita.
              </p>
              <div className="order-detail-section" style={{ flexDirection: 'column', alignItems: 'flex-start', display: 'flex' }}>
                <label style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Motivo do cancelamento *</label>
                <textarea
                  autoFocus
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ex: Cliente desistiu, item em falta, endereço fora da área de entrega..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: 'white', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="order-details-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-close-modal" onClick={() => setCancelingOrder(null)} disabled={cancelSubmitting}>
                Voltar
              </button>
              <button
                className="btn-action"
                style={{ background: '#ef4444', borderColor: '#ef4444', color: 'white' }}
                onClick={handleCancelOrder}
                disabled={cancelSubmitting || !cancelReason.trim()}
              >
                {cancelSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
