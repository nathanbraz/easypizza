import { Plus } from 'lucide-react';
import type { Product } from '../../types';
import './ProductCard.css';
import { getDisplayPrice } from '../../utils/getDisplayPrice';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  delay: number;
}

export default function ProductCard({ product, onAdd, delay }: ProductCardProps) {
  const imgUrl = product.imageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null);
  
  const getFallbackImage = () => {
    if (product.categoryName?.toLowerCase().includes('bebida') || product.name.toLowerCase().includes('cola')) {
      return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60';
    }
    return 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60';
  };

  const finalImage = imgUrl || getFallbackImage();

  return (
    <div 
      className="product-card animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="product-image-container">
        <img src={finalImage} alt={product.name} />
        <div className="price-tag">{getDisplayPrice(product)}</div>
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
