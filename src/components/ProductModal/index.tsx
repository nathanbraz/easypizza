import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import './ProductModal.css';
import { formatCurrency } from '../../utils/formatCurrency';

import type { Product, ProductOptionGroup } from '../../types';

interface ProductModalProps {
  product: Product;
  availableProducts: Product[]; // Todos os produtos da API (pra resolver os sabores do grupo de Sabores)
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export default function ProductModal({ product, availableProducts, onClose, onAddToCart }: ProductModalProps) {
  // As opções do produto já vêm prontas em `product.optionGroups` — o mesmo GET /menu/{tenantSlug}
  // que carregou o cardápio já mescla os grupos próprios (Adicionais extras) com os compartilhados
  // da categoria (Tamanho, Borda, Sabores), com o preço correto para ESTE produto. Não precisa de fetch aqui.
  const optionGroups: ProductOptionGroup[] = product.optionGroups || [];

  // Tamanho/Borda (isShared) são propriedades da pizza inteira, únicas por categoria — usamos o
  // MESMO id em qualquer produto da categoria, então dá pra comparar/combinar entre sabores por id,
  // sem depender de casar nomes de texto (era isso que causava o bug do meio a meio antigo).
  const sharedGroups = optionGroups.filter((g) => g.isShared);
  const ownGroups = optionGroups.filter((g) => !g.isShared);

  // Meio a Meio (Sabores): generalizado como só mais um grupo compartilhado da categoria — cada
  // item nele referencia um Produto-sabor real (linkedProductId). Precisa ser tratado à parte só
  // na hora de PREÇO (não entra na soma genérica de additionalPrice; o valor vem da estratégia de
  // combinação da loja), mas a SELEÇÃO usa exatamente a mesma UI/estado que qualquer outro grupo.
  const flavorGroup = sharedGroups.find((g) => g.isFlavorGroup);
  const nonFlavorGroups = optionGroups.filter((g) => g.id !== flavorGroup?.id);
  const nonFlavorSharedGroups = sharedGroups.filter((g) => g.id !== flavorGroup?.id);

  // State for radio/checkbox selections (key: groupId, value: array of itemIds)
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    optionGroups.forEach((g) => { initial[g.id] = []; });
    return initial;
  });
  // State for counter quantities (key: itemId, value: quantity number)
  const [counterQuantities, setCounterQuantities] = useState<Record<string, number>>({});

  const [observation, setObservation] = useState('');
  const [quantity, setQuantity] = useState(1);

  useLockBodyScroll();

  const handleToggleOption = (groupId: string, itemId: string, maxChoices: number) => {
    setSelections(prev => {
      const currentSelection = prev[groupId] || [];

      if (maxChoices === 1) {
        // Radio button behavior
        return { ...prev, [groupId]: [itemId] };
      } else {
        // Checkbox behavior
        if (currentSelection.includes(itemId)) {
          return { ...prev, [groupId]: currentSelection.filter(id => id !== itemId) };
        } else {
          if (currentSelection.length < maxChoices) {
            return { ...prev, [groupId]: [...currentSelection, itemId] };
          } else {
            return prev; // Reached max limit
          }
        }
      }
    });
  };

  const handleCounterChange = (groupId: string, itemId: string, delta: number, groupMax: number) => {
    setCounterQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);

      // Calculate total items in this group
      const group = optionGroups.find((g) => g.id === groupId);
      if (!group) return prev;
      const totalInGroup = group.options.reduce((sum: number, opt) => {
        const qty = opt.id === itemId ? newQty : (prev[opt.id] || 0);
        return sum + qty;
      }, 0);

      if (totalInGroup > groupMax) return prev; // Exceeded group max
      return { ...prev, [itemId]: newQty };
    });
  };

  // Pricing Logic
  const basePrice = product.price;

  // Calcula o total das opções normais (Tamanho, Borda, Adicionais) — o grupo de Sabores fica de
  // fora dessa soma de propósito: o preço dele não é "por item", é o resultado da estratégia de
  // combinação (ver flavorExtraPrice abaixo).
  let optionsTotal = 0;
  const selectedOptionObjects: any[] = [];

  nonFlavorGroups.forEach((g) => {
    if (g.groupType === 'counter') {
      // Counter groups: sum quantities
      g.options.forEach((opt) => {
        const qty = counterQuantities[opt.id] || 0;
        if (qty > 0) {
          optionsTotal += (opt.additionalPrice || 0) * qty;
          selectedOptionObjects.push({ groupName: g.name, ...opt, quantity: qty });
        }
      });
    } else {
      // Radio/Checkbox groups
      const selectedIds = selections[g.id] || [];
      selectedIds.forEach((itemId: string) => {
        const item = g.options.find((opt) => opt.id === itemId);
        if (item) {
          optionsTotal += (item.additionalPrice || 0);
          selectedOptionObjects.push({ groupName: g.name, ...item, quantity: 1 });
        }
      });
    }
  });

  // Preço total que UM sabor cobraria sozinho, com as MESMAS opções compartilhadas (Tamanho,
  // Borda) já escolhidas — usado pra aplicar a estratégia de combinação (mais caro/soma/média/mais
  // barato) sobre o conjunto {sabor principal, sabores extras}. Só uma prévia: o backend sempre
  // recalcula isso do zero a partir do catálogo, nunca confia neste valor.
  const getFlavorTotal = (flavorProduct: Product) => {
    const flavorGroups = flavorProduct.optionGroups || [];
    let total = flavorProduct.price;
    nonFlavorSharedGroups.forEach((g) => {
      const selectedIds = selections[g.id] || [];
      const matchingGroup = flavorGroups.find((fg) => fg.id === g.id);
      selectedIds.forEach((itemId) => {
        const opt = matchingGroup?.options.find((o) => o.id === itemId);
        if (opt) total += (opt.additionalPrice || 0);
      });
    });
    return total;
  };

  const selectedFlavorProducts = flavorGroup
    ? (selections[flavorGroup.id] || [])
        .map((itemId) => {
          const item = flavorGroup.options.find((o) => o.id === itemId);
          return item?.linkedProductId ? availableProducts.find((p) => p.id === item.linkedProductId) : null;
        })
        .filter((p): p is Product => !!p)
    : [];

  let flavorExtraPrice = 0;
  if (flavorGroup && selectedFlavorProducts.length > 0) {
    const baseTotal = getFlavorTotal(product);
    const allTotals = [baseTotal, ...selectedFlavorProducts.map(getFlavorTotal)];
    const strategy = flavorGroup.flavorPriceStrategy;
    let combinedTotal: number;
    if (strategy === 'Soma' || strategy === 1) combinedTotal = allTotals.reduce((a, b) => a + b, 0);
    else if (strategy === 'Media' || strategy === 2) combinedTotal = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;
    else if (strategy === 'MaisBarato' || strategy === 3) combinedTotal = Math.min(...allTotals);
    else combinedTotal = Math.max(...allTotals); // MaisCaro (padrão)
    flavorExtraPrice = Math.max(0, combinedTotal - baseTotal);
  }

  const unitTotal = basePrice + optionsTotal + flavorExtraPrice;
  const finalTotal = unitTotal * quantity;

  // Validation: counter groups just need to be present, radio/checkbox groups need minChoices
  const isValid = optionGroups.every((g) => {
    let selectedCount = 0;
    if (g.groupType === 'counter') {
      selectedCount = g.options?.reduce((sum: number, opt) => sum + (counterQuantities[opt.id] || 0), 0) || 0;
    } else {
      selectedCount = (selections[g.id] || []).length;
    }
    return selectedCount >= g.minChoices;
  });

  const handleConfirm = () => {
    if (!isValid) {
      alert("Por favor, preencha todos os itens obrigatórios.");
      return;
    }

    // Pseudo-opção "Meio a Meio" só pra aparecer no carrinho (nome, preço combinado) — o pedido de
    // verdade manda os ids dos Produtos-sabor extras separados (flavorProductIds, abaixo), já que o
    // preço não é "por item" nesse grupo. O backend recalcula esse preço do zero a partir do
    // catálogo, nunca confia neste valor aqui.
    const finalSelectedOptions = [...selectedOptionObjects];
    if (selectedFlavorProducts.length > 0) {
      finalSelectedOptions.push({
        groupName: 'Meio a Meio',
        name: selectedFlavorProducts.map((p) => p.name).join(' + '),
        additionalPrice: flavorExtraPrice,
        quantity: 1
      });
    }

    const finalItem = {
      baseProduct: product,
      selectedOptions: finalSelectedOptions,
      observation,
      quantity,
      finalPrice: finalTotal,
      flavorProductIds: selectedFlavorProducts.map((p) => p.id)
    };
    onAddToCart(finalItem);
    onClose();
  };

  const renderGroupOptions = (group: ProductOptionGroup) => {
    return (
      <div className={group.groupType === 'counter' ? 'counter-group' : (group.maxChoices === 1 ? "radio-group" : "checkbox-group")}>
        {group.options.map((opt) => {
          const isSelected = (selections[group.id] || []).includes(opt.id);
          const isMaxReached = (selections[group.id] || []).length >= group.maxChoices;
          const disabled = !isSelected && isMaxReached && group.maxChoices > 1;

          if (group.groupType === 'counter') {
            const qty = counterQuantities[opt.id] || 0;
            return (
              <div key={opt.id} className="counter-item">
                <div className="counter-item-info">
                  <span className="name">{opt.name}</span>
                  <span className="price">{opt.additionalPrice > 0 ? `R$ ${formatCurrency(opt.additionalPrice)}` : 'Grátis'}</span>
                </div>
                <div className="counter-controls">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleCounterChange(group.id, opt.id, -1, group.maxChoices)}
                    disabled={qty === 0}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="counter-value">{qty}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleCounterChange(group.id, opt.id, 1, group.maxChoices)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          } else if (group.maxChoices === 1) {
            return (
              <label key={opt.id} className={`radio-card ${isSelected ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name={`group_${group.id}`}
                  checked={isSelected}
                  onChange={() => handleToggleOption(group.id, opt.id, group.maxChoices)}
                />
                <div className="radio-info">
                  <span className="name">{opt.name}</span>
                  <span className="price">{opt.additionalPrice > 0 ? `+ R$ ${formatCurrency(opt.additionalPrice)}` : (opt.additionalPrice < 0 ? `- R$ ${formatCurrency(Math.abs(opt.additionalPrice))}` : (product.price === 0 ? `R$ ${formatCurrency(opt.additionalPrice)}` : ''))}</span>
                </div>
              </label>
            );
          } else {
            return (
              <label key={opt.id} className={`checkbox-item ${disabled ? 'disabled' : ''}`} style={{ opacity: disabled ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => handleToggleOption(group.id, opt.id, group.maxChoices)}
                />
                <span className="name">{opt.name}</span>
                <span className="price">{opt.additionalPrice > 0 ? `+ R$ ${formatCurrency(opt.additionalPrice)}` : ''}</span>
              </label>
            );
          }
        })}
      </div>
    );
  };

  const renderGroupSection = (group: ProductOptionGroup) => {
    let selectedCount = 0;
    if (group.groupType === 'counter') {
      selectedCount = group.options?.reduce((sum: number, opt) => sum + (counterQuantities[opt.id] || 0), 0) || 0;
    } else {
      selectedCount = (selections[group.id] || []).length;
    }
    const isGroupValid = selectedCount >= group.minChoices;

    return (
      <section key={group.id} className="modal-section">
        <div className="section-header">
          <div>
            <h3>{group.name}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              {group.minChoices > 0 ? `Escolha de ${group.minChoices} até ${group.maxChoices} opções` : `Escolha até ${group.maxChoices} opções`}
            </p>
          </div>
          <span className="required-badge" style={{ backgroundColor: isGroupValid ? 'rgba(34, 197, 94, 0.1)' : '', color: isGroupValid ? '#22c55e' : '' }}>
            {isGroupValid ? `✓ Concluído (${selectedCount}/${group.maxChoices})` : `${selectedCount}/${group.maxChoices}`}
          </span>
        </div>
        {renderGroupOptions(group)}
        {group.id === flavorGroup?.id && flavorExtraPrice > 0 && (
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)', backgroundColor: 'rgba(255,87,34,0.1)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,87,34,0.2)', marginTop: '12px' }}>
            <span style={{ fontSize: '18px' }}>💰</span> Combinação de sabores: + R$ {formatCurrency(flavorExtraPrice)}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header-image">
          <img src={product.imageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : (product.categoryName?.toLowerCase().includes('bebida') || product.name.toLowerCase().includes('cola') ? 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=60' : 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=60'))} alt={product.name} />
        </div>

        <div className="modal-scroll-area">
          <div className="modal-intro">
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>

          {/* 1. Opções compartilhadas da categoria (Tamanho, Borda) */}
          {nonFlavorSharedGroups.map(renderGroupSection)}

          {/* 2. Sabores extras (Meio a Meio) — mesma UI genérica de qualquer grupo compartilhado */}
          {flavorGroup && renderGroupSection(flavorGroup)}

          {/* 3. Opções próprias do produto (ex: Adicionais extras) */}
          {ownGroups.map(renderGroupSection)}

          <section className="modal-section">
            <div className="section-header">
              <h3>Alguma observação?</h3>
            </div>
            <textarea
              className="observation-input"
              placeholder="Ex: Tirar a cebola, assar bem a massa..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </section>
        </div>

        <div className="modal-footer">
          <div className="quantity-selector">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
          </div>
          <button
            className="confirm-btn"
            onClick={handleConfirm}
            style={{ opacity: isValid ? 1 : 0.5 }}
          >
            Adicionar • R$ {formatCurrency(finalTotal)}
          </button>
        </div>
      </div>
    </div>
  );
}
