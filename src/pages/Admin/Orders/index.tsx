import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import './Orders.css';

type OrderStatus = 'new' | 'preparing' | 'delivering' | 'done';

interface Order {
  id: string;
  customerName: string;
  itemsSummary: string;
  total: number;
  time: string;
  status: OrderStatus;
}

const fakeOrders: Order[] = [
  { id: '#1492', customerName: 'João Silva', itemsSummary: '1x Pizza Calabresa\n1x Coca 2L', total: 65.90, time: '20:15', status: 'new' },
  { id: '#1493', customerName: 'Maria Souza', itemsSummary: '2x Pizza Marguerita', total: 90.00, time: '20:18', status: 'new' },
  { id: '#1490', customerName: 'Pedro Santos', itemsSummary: '1x Meio a Meio (4 Queijos/Frango)', total: 55.00, time: '19:55', status: 'preparing' },
  { id: '#1489', customerName: 'Ana Clara', itemsSummary: '1x Pizza Pepperoni', total: 48.00, time: '19:40', status: 'delivering' },
];

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>(fakeOrders);

  const getOrdersByStatus = (status: OrderStatus) => orders.filter(o => o.status === status);

  const moveOrder = (id: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const columns: { id: OrderStatus; title: string }[] = [
    { id: 'new', title: 'Novos' },
    { id: 'preparing', title: 'Preparando' },
    { id: 'delivering', title: 'Em Entrega' },
    { id: 'done', title: 'Finalizados' }
  ];

  return (
    <div className="orders-kds animate-fade-in">
      <header className="kds-header">
        <h1>Pedidos (KDS)</h1>
      </header>
      
      <div className="kds-kanban">
        {columns.map(col => {
          const colOrders = getOrdersByStatus(col.id);
          return (
            <div key={col.id} className="kanban-column glass-panel">
              <div className="kanban-column-header">
                <h3>{col.title}</h3>
                <span className="kanban-badge">{colOrders.length}</span>
              </div>
              <div className="kanban-cards">
                {colOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <span className="order-id">{order.id}</span>
                      <span className="order-time">{order.time}</span>
                    </div>
                    <div className="order-customer">{order.customerName}</div>
                    <div className="order-items" style={{ whiteSpace: 'pre-line' }}>{order.itemsSummary}</div>
                    <div className="order-footer">
                      <span className="order-total">R$ {order.total.toFixed(2)}</span>
                      <div className="order-actions">
                        {col.id === 'new' && <button className="btn-action" onClick={() => moveOrder(order.id, 'preparing')}>Preparar</button>}
                        {col.id === 'preparing' && <button className="btn-action" onClick={() => moveOrder(order.id, 'delivering')}>Entregar</button>}
                        {col.id === 'delivering' && <button className="btn-action" onClick={() => moveOrder(order.id, 'done')}>Concluir</button>}
                        <button className="btn-icon"><MoreVertical size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
