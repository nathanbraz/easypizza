import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import './Cart.css';

interface CartProps {
  items: any[];
  onCheckout: () => void;
}

export default function Cart({ items, onCheckout }: CartProps) {
  const total = items.reduce((sum, item) => sum + item.finalPrice, 0);

  return (
    <div className="cart-floating glass-panel animate-fade-in">
      <div className="cart-info">
        <div className="cart-icon-wrapper">
          <ShoppingBag size={24} color="#f97316" />
          <span className="badge">{items.length}</span>
        </div>
        <div className="cart-total">
          <span className="cart-label">Total do Pedido</span>
          <strong>R$ {total.toFixed(2)}</strong>
        </div>
      </div>
      <button className="checkout-btn" onClick={onCheckout}>
        <span>Avançar</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
