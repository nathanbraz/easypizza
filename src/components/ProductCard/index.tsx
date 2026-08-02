import { Plus } from 'lucide-react';
import type { Product } from '../../types';
import './ProductCard.css';
import { formatCurrency } from '../../utils/formatCurrency';

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

  const getDisplayPrice = () => {
    if (product.price > 0) {
      return `R$ ${formatCurrency(product.price)}`;
    }

    let minAdditionalPrice = 0;
    let hasMandatoryOptions = false;

    if (product.optionGroups && product.optionGroups.length > 0) {
      product.optionGroups.forEach((group: any) => {
        if (group.minChoices > 0 && group.options && group.options.length > 0) {
          hasMandatoryOptions = true;
          // Encontra a opção mais barata deste grupo obrigatório
          const cheapestOption = Math.min(...group.options.map((o: any) => o.additionalPrice));
          minAdditionalPrice += (cheapestOption * group.minChoices);
        }
      });
    }

    if (hasMandatoryOptions && minAdditionalPrice > 0) {
      return `A partir de R$ ${formatCurrency(minAdditionalPrice)}`;
    }

    if (product.optionGroups && product.optionGroups.length > 0) {
      return 'Ver opções';
    }

    return 'Grátis';
  };

  return (
    <div 
      className="product-card animate-fade-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="product-image-container">
        <img src={finalImage} alt={product.name} />
        <div className="price-tag">{getDisplayPrice()}</div>
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
