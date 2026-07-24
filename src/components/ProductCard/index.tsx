import React from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '../../types';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  delay: number;
}

export default function ProductCard({ product, onAdd, delay }: ProductCardProps) {
  return (
    <div 
      className="product-card animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="product-image-container">
        <img src={product.imageUrl || ''} alt={product.name} />
        <div className="price-tag">R$ {product.price.toFixed(2)}</div>
      </div>
      
      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        
        <div className="product-footer">
          <button className="add-btn" onClick={() => onAdd(product)}>
            <Plus size={18} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
