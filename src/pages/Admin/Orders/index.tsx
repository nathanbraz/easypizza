import { useState, useEffect } from 'react';
import { MoreVertical, RefreshCw } from 'lucide-react';
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
  id: string;
  createdAt: string;
  status: number | string;
  totalAmount?: number;
  subTotal?: number;
  customer?: {
    name: string;
  };
  items?: OrderItem[];
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const slug = getTenantSlugFromUrl();
      const res = await api.get(`/orders/admin/${slug}`);
      const data = res.data.data || res.data || [];
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error("Erro ao buscar pedidos administrativos:", error);
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

  const moveOrder = async (orderId: string, nextStatus: number) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === nextStatus) return; // Já está neste status

    // Atualização otimista na interface
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
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

  const formatId = (id: string) => {
    if (id.startsWith('#')) return id;
    return '#' + id.slice(0, 6).toUpperCase();
  };

  const columns: { id: ColumnStatus; title: string }[] = [
    { id: 'new', title: 'Novos' },
    { id: 'preparing', title: 'Preparando' },
    { id: 'delivering', title: 'Em Entrega' },
    { id: 'done', title: 'Finalizados' }
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
                <h3>{col.title}</h3>
                <span className="kanban-badge">{colOrders.length}</span>
              </div>
              <div className="kanban-cards">
                {colOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0', pointerEvents: 'none' }}>
                    Nenhum pedido nesta etapa
                  </div>
                ) : (
                  colOrders.map(order => (
                    <div 
                      key={order.id} 
                      className="order-card"
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', order.id);
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
                          <button className="btn-icon"><MoreVertical size={16} /></button>
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
    </div>
  );
}
