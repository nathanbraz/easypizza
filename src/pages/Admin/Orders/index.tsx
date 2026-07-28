import { useState, useEffect } from 'react';
import { MoreVertical, RefreshCw, X, User, MapPin, CreditCard, ShoppingBag, Eye, Printer, Inbox } from 'lucide-react';
import { api, getTenantSlugFromUrl } from '../../../lib/api';
import './Orders.css';

type ColumnStatus = 'new' | 'preparing' | 'delivering' | 'done';

interface OrderItem {
  quantity: number;
  unitPrice: number;
  product?: {
    name: string;
  };
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
  items?: OrderItem[];
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | number | null>(null);

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
    return orders.filter(o => getColumnForStatus(o.status) === colId);
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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getItemsSummary = (order: Order) => {
    if (!order.items || order.items.length === 0) return 'Sem itens registrados';
    return order.items.map(i => `${i.quantity}x ${i.product?.name || 'Item'}`).join('\n');
  };

  const formatId = (id: string | number) => {
    if (String(id).startsWith('#')) return String(id);
    return '#' + id;
  };

  const printOrderTicket = (order: Order) => {
    const isPickup = Number(order.type) === 2 || order.type === 'Pickup';
    const createdAtStr = new Date(order.createdAt).toLocaleString('pt-BR');
    const customerPhone = order.customer?.phoneNumber || order.customer?.PhoneNumber || 'Não informado';
    
    let addressHtml = '<div class="text-center bold" style="margin: 4px 0;">RETIRADA NO BALCÃO</div>';
    if (!isPickup && order.address) {
      addressHtml = `
        <div class="bold" style="margin-top: 4px;">ENTREGA EM DOMICÍLIO:</div>
        <div>${order.address.street || ''}, nº ${order.address.number || 'S/N'}</div>
        ${order.address.complement ? `<div>Compl: ${order.address.complement}</div>` : ''}
        <div>Bairro: ${order.address.neighborhood || ''}</div>
        <div>Cidade: ${order.address.city || ''}</div>
      `;
    }

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        const itemTotal = (item.quantity * Number(item.unitPrice || 0)).toFixed(2);
        itemsHtml += `
          <tr>
            <td class="item-qty">${item.quantity}x</td>
            <td>${item.product?.name || 'Item'}</td>
            <td class="item-price">R$ ${itemTotal}</td>
          </tr>
        `;
      });
    } else {
      itemsHtml = '<tr><td colspan="3" class="text-center">Nenhum item</td></tr>';
    }

    const subTotal = Number(order.subTotal || 0).toFixed(2);
    const deliveryFee = Number(order.deliveryFee || 0).toFixed(2);
    const discount = Number(order.discountAmount || 0).toFixed(2);
    const total = Number(order.totalAmount ?? order.subTotal ?? 0).toFixed(2);

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
    <div className="orders-kds animate-fade-in" onClick={() => { if (openMenuOrderId !== null) setOpenMenuOrderId(null); }}>
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
              style={{ borderTop: `3px solid ${col.color}`, boxShadow: `0 -4px 20px -10px ${col.color}` }}
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
                  const statusMap: Record<ColumnStatus, number> = {
                    new: 1,
                    preparing: 2,
                    delivering: 3,
                    done: 4
                  };
                  moveOrder(orderId, statusMap[col.id]);
                }
              }}
            >
              <div className="kanban-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}` }}></span>
                  <h3 style={{ color: col.id === 'new' ? '#ffedd5' : 'var(--text-main)' }}>{col.title}</h3>
                </div>
                <span className="kanban-badge" style={{ backgroundColor: `${col.color}20`, color: col.color, border: `1px solid ${col.color}40` }}>{colOrders.length}</span>
              </div>
              <div className="kanban-cards">
                {colOrders.length === 0 ? (
                  <div className="empty-column" style={{ borderColor: `${col.color}25` }}>
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
                      style={{ borderLeft: `3px solid ${col.color}` }}
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
                        <span className="order-id">{formatId(order.id)}</span>
                        <span className="order-time">{formatTime(order.createdAt)}</span>
                      </div>
                      <div className="order-customer">{order.customer?.name || 'Cliente'}</div>
                      <div className="order-items" style={{ whiteSpace: 'pre-line' }}>{getItemsSummary(order)}</div>
                      <div className="order-footer">
                        <span className="order-total">R$ {(order.totalAmount ?? order.subTotal ?? 0).toFixed(2)}</span>
                        <div className="order-actions">
                          {col.id === 'new' && <button className="btn-action" onClick={() => moveOrder(order.id, 2)}>Preparar</button>}
                          {col.id === 'preparing' && <button className="btn-action" onClick={() => moveOrder(order.id, 3)}>Entregar</button>}
                          {col.id === 'delivering' && <button className="btn-action" onClick={() => moveOrder(order.id, 4)}>Concluir</button>}
                          <button 
                            className="btn-icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuOrderId(openMenuOrderId === order.id ? null : order.id);
                            }} 
                            title="Opções do Pedido"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuOrderId === order.id && (
                            <div className="order-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setOpenMenuOrderId(null); setSelectedOrder(order); }}>
                                <Eye size={14} /> Detalhes do Pedido
                              </button>
                              <button onClick={() => { setOpenMenuOrderId(null); printOrderTicket(order); }}>
                                <Printer size={14} /> Imprimir Pedido
                              </button>
                            </div>
                          )}
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
                        <tr key={idx}>
                          <td><strong>{item.quantity}x</strong></td>
                          <td>{item.product?.name || 'Item'}</td>
                          <td style={{ textAlign: 'right' }}>R$ {(item.quantity * Number(item.unitPrice || 0)).toFixed(2)}</td>
                        </tr>
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
                  <span>R$ {Number(selectedOrder.subTotal || 0).toFixed(2)}</span>
                </div>
                <div className="order-detail-row">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {Number(selectedOrder.deliveryFee || 0).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.discountAmount) > 0 && (
                  <div className="order-detail-row" style={{ color: '#22c55e' }}>
                    <span>Desconto {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ''}:</span>
                    <span>- R$ {Number(selectedOrder.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="order-detail-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '15px' }}>
                  <strong style={{ color: 'var(--primary, #f97316)' }}>Total do Pedido:</strong>
                  <strong style={{ color: 'var(--primary, #f97316)', fontSize: '16px' }}>R$ {Number(selectedOrder.totalAmount ?? selectedOrder.subTotal ?? 0).toFixed(2)}</strong>
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
    </div>
  );
}
