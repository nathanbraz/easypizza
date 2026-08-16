import { useState, useRef } from 'react';
import { X, Plus, Minus, Search, CheckCircle2 } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import './ProductModal.css';
import { formatCurrency } from '../../utils/formatCurrency';

import type { Product } from '../../types';

interface ProductModalProps {
  product: Product;
  availableProducts: Product[]; // All products from the API (for half/half and drinks)
  onClose: () => void;
  onAddToCart: (item: any) => void;
}

export default function ProductModal({ product, availableProducts, onClose, onAddToCart }: ProductModalProps) {
  // As opções do produto já vêm prontas em `product.optionGroups` — o mesmo GET /menu/{tenantSlug}
  // que carregou o cardápio já mescla os grupos próprios (Adicionais extras) com os compartilhados
  // da categoria (Tamanho, Borda), com o preço correto para ESTE produto. Não precisa de fetch aqui.
  const optionGroups: any[] = product.optionGroups || [];

  // Tamanho/Borda (isShared) são propriedades da pizza inteira, únicas por categoria — usamos o
  // MESMO id em qualquer produto da categoria, então dá pra comparar/combinar entre sabores por id,
  // sem depender de casar nomes de texto (era isso que causava o bug do meio a meio antigo).
  const sharedGroups = optionGroups.filter((g: any) => g.isShared);
  const ownGroups = optionGroups.filter((g: any) => !g.isShared);

  // State for radio/checkbox selections (key: groupId, value: array of itemIds)
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    optionGroups.forEach((g: any) => { initial[g.id] = []; });
    return initial;
  });
  // State for counter quantities (key: itemId, value: quantity number)
  const [counterQuantities, setCounterQuantities] = useState<Record<string, number>>({});

  // Cross-sell Drinks
  const [selectedDrinks] = useState<any[]>([]);
  const [observation, setObservation] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Half and Half (Meio a Meio)
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [secondHalfProductId, setSecondHalfProductId] = useState<string>('');
  const [searchHalf, setSearchHalf] = useState('');

  // Drag to scroll
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDist, setDragDist] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setDragDist(0);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    setDragDist(Math.abs(walk));
    carouselRef.current.scrollLeft = scrollLeft - walk;
  };

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
      const group = optionGroups.find((g: any) => g.id === groupId);
      if (!group) return prev;
      const totalInGroup = group.options.reduce((sum: number, opt: any) => {
        const qty = opt.id === itemId ? newQty : (prev[opt.id] || 0);
        return sum + qty;
      }, 0);

      if (totalInGroup > groupMax) return prev; // Exceeded group max
      return { ...prev, [itemId]: newQty };
    });
  };

  // Pricing Logic
  const basePrice = product.price;

  // Calculate total additional price from selected options (radio/checkbox)
  let optionsTotal = 0;
  const selectedOptionObjects: any[] = [];

  optionGroups.forEach((g: any) => {
    if (g.groupType === 'counter') {
      // Counter groups: sum quantities
      g.options.forEach((opt: any) => {
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
        const item = g.options.find((opt: any) => opt.id === itemId);
        if (item) {
          optionsTotal += (item.additionalPrice || 0);
          selectedOptionObjects.push({ groupName: g.name, ...item, quantity: 1 });
        }
      });
    }
  });

  // Um 2º sabor só pode ser combinado se oferecer TODAS as opções compartilhadas (Tamanho, Borda)
  // já escolhidas no 1º sabor — evita "meio Tamanho G, meio Tamanho não-existe" ou bordas
  // divididas por metade, que o lojista não faz (ver conversa sobre isso).
  const candidateOffersCurrentSharedSelection = (candidate: any) => {
    const candidateGroups: any[] = candidate.optionGroups || [];
    return sharedGroups.every((g: any) => {
      const selectedIds = selections[g.id] || [];
      if (selectedIds.length === 0) return true; // nada escolhido nesse grupo ainda, não restringe
      const candidateGroup = candidateGroups.find((cg: any) => cg.id === g.id);
      const candidateItemIds = new Set((candidateGroup?.options || []).map((o: any) => o.id));
      return selectedIds.every((id: string) => candidateItemIds.has(id));
    });
  };

  // Half and Half logic
  let halfAndHalfExtraPrice = 0;
  let secondHalfProductObj: any = null;
  let secondHalfOptionGroups: any[] = [];

  if (isHalfAndHalf && secondHalfProductId) {
    secondHalfProductObj = availableProducts.find(p => p.id === secondHalfProductId) || null;
    if (secondHalfProductObj) {
      secondHalfOptionGroups = secondHalfProductObj.optionGroups || [];

      // Para cada opção compartilhada escolhida (Tamanho, Borda), compara o preço que CADA sabor
      // cobra pelo MESMO item (mesmo id) e cobra a diferença do mais caro — sem casar por nome.
      sharedGroups.forEach((g: any) => {
        const selectedIds = selections[g.id] || [];
        selectedIds.forEach((itemId: string) => {
          const mainOpt = g.options.find((o: any) => o.id === itemId);
          const secondGroup = secondHalfOptionGroups.find((sg: any) => sg.id === g.id);
          const secondOpt = secondGroup?.options.find((o: any) => o.id === itemId);
          if (mainOpt && secondOpt) {
            const diff = (secondOpt.additionalPrice || 0) - (mainOpt.additionalPrice || 0);
            if (diff > 0) halfAndHalfExtraPrice += diff;
          }
        });
      });

      const baseDiff = secondHalfProductObj.price - basePrice;
      if (baseDiff > 0) {
        halfAndHalfExtraPrice += baseDiff;
      }
    }
  }

  // Uma vez que o 2º sabor está escolhido, as opções compartilhadas exibidas pro cliente se
  // restringem à interseção do que os dois sabores oferecem — pra não deixar montar uma combinação
  // que só um dos dois sabores suporta.
  const getSharedGroupDisplayOptions = (group: any) => {
    if (!isHalfAndHalf || !secondHalfProductObj) return group.options;
    const secondGroup = secondHalfOptionGroups.find((sg: any) => sg.id === group.id);
    const secondIds = new Set((secondGroup?.options || []).map((o: any) => o.id));
    return group.options.filter((o: any) => secondIds.has(o.id));
  };

  const drinksTotal = selectedDrinks.reduce((sum, d) => sum + d.price, 0);

  const unitTotal = basePrice + optionsTotal + halfAndHalfExtraPrice;
  const finalTotal = (unitTotal * quantity) + drinksTotal;

  // Validation: counter groups just need to be present, radio/checkbox groups need minChoices
  const isValid = optionGroups.every((g: any) => {
    let selectedCount = 0;
    if (g.groupType === 'counter') {
      selectedCount = g.options?.reduce((sum: number, opt: any) => sum + (counterQuantities[opt.id] || 0), 0) || 0;
    } else {
      selectedCount = (selections[g.id] || []).length;
    }
    return selectedCount >= g.minChoices;
  });

  const sharedGroupsValid = sharedGroups.every((g: any) => (selections[g.id] || []).length >= g.minChoices);

  const handleConfirm = () => {
    if (!isValid) {
      alert("Por favor, preencha todos os itens obrigatórios.");
      return;
    }

    if (isHalfAndHalf && secondHalfProductId && !secondHalfProductObj) {
      alert("Selecione um sabor válido para a 2ª metade.");
      return;
    }

    // Add the second half as a pseudo-option so it appears in the cart and backend
    const finalSelectedOptions = [...selectedOptionObjects];
    if (isHalfAndHalf && secondHalfProductObj) {
      finalSelectedOptions.push({
        groupName: 'Meio a Meio',
        name: `Meia ${secondHalfProductObj.name}`,
        additionalPrice: halfAndHalfExtraPrice,
        quantity: 1,
        description: secondHalfProductObj.description,
        imageUrl: secondHalfProductObj.imageUrl || (secondHalfProductObj.imageUrls && secondHalfProductObj.imageUrls.length > 0 ? secondHalfProductObj.imageUrls[0] : null)
      });
    }

    const finalItem = {
      baseProduct: product,
      selectedOptions: finalSelectedOptions,
      selectedDrinks,
      observation,
      quantity,
      finalPrice: finalTotal
    };
    onAddToCart(finalItem);
    onClose();
  };

  const renderGroupOptions = (group: any) => {
    const displayOptions = group.isShared ? getSharedGroupDisplayOptions(group) : group.options;

    return (
      <div className={group.groupType === 'counter' ? 'counter-group' : (group.maxChoices === 1 ? "radio-group" : "checkbox-group")}>
        {displayOptions.map((opt: any) => {
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

  const renderGroupSection = (group: any) => {
    let selectedCount = 0;
    if (group.groupType === 'counter') {
      selectedCount = group.options?.reduce((sum: number, opt: any) => sum + (counterQuantities[opt.id] || 0), 0) || 0;
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

          {/* 1. Opções compartilhadas da categoria primeiro (Tamanho, Borda) — são propriedades da
              pizza inteira, então precisam estar definidas antes de montar um meio a meio. */}
          {sharedGroups.map(renderGroupSection)}

          {/* 2. Meio a Meio — só libera depois que Tamanho/Borda estão escolhidos, pra já filtrar
              os sabores compatíveis e a interseção de opções corretamente. */}
          {(product as any).allowsHalfAndHalf && (
            <section className="highlight-section" style={{ marginTop: '24px', marginBottom: '24px', paddingBottom: '32px' }}>
              <div style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-full)', padding: '6px', marginBottom: '12px' }}>
                <button
                  onClick={() => { setIsHalfAndHalf(false); setSecondHalfProductId(''); }}
                  style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-full)', border: 'none', backgroundColor: !isHalfAndHalf ? 'var(--primary)' : 'transparent', color: !isHalfAndHalf ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  🍕 Inteira
                </button>
                <button
                  onClick={() => { if (sharedGroupsValid) setIsHalfAndHalf(true); }}
                  disabled={!sharedGroupsValid}
                  title={!sharedGroupsValid ? 'Escolha as opções acima primeiro' : undefined}
                  style={{ flex: 1, padding: '14px', borderRadius: 'var(--radius-full)', border: 'none', backgroundColor: isHalfAndHalf ? 'var(--primary)' : 'transparent', color: isHalfAndHalf ? '#fff' : 'var(--text-muted)', fontWeight: 600, fontSize: '16px', transition: 'all 0.3s ease', cursor: sharedGroupsValid ? 'pointer' : 'not-allowed', opacity: sharedGroupsValid ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  🌗 Meio a Meio
                </button>
              </div>

              {!sharedGroupsValid && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 8px' }}>
                  Escolha as opções acima para poder montar meio a meio.
                </p>
              )}

              {isHalfAndHalf && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Metade 2 (Seleção) */}
                  <div>
                    <p style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 10px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Escolha a 2ª Metade
                    </p>

                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Buscar sabor para a 2ª metade..."
                        value={searchHalf}
                        onChange={(e) => setSearchHalf(e.target.value)}
                        style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '15px', outline: 'none', transition: 'all 0.2s ease' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>

                    <div
                      ref={carouselRef}
                      className="hide-scrollbar"
                      style={{
                        display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px',
                        scrollSnapType: isDragging ? 'none' : 'x mandatory',
                        margin: '0 -24px', padding: '0 24px 16px 24px',
                        scrollBehavior: isDragging ? 'auto' : 'smooth',
                        cursor: isDragging ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseLeave={handleMouseLeave}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                    >
                      {availableProducts
                        .filter(p => p.categoryId === (product as any).categoryId && p.id !== product.id && p.name.toLowerCase().includes(searchHalf.toLowerCase()))
                        .filter(candidateOffersCurrentSharedSelection)
                        .map(p => {
                          const isSelected = secondHalfProductId === p.id;
                          const img = p.imageUrl || (p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : null);

                          // Preço estimado usando o que ESSE sabor cobra pelas mesmas opções compartilhadas já escolhidas.
                          const candidateGroups: any[] = p.optionGroups || [];
                          const sharedExtra = sharedGroups.reduce((sum: number, g: any) => {
                            const selectedIds = selections[g.id] || [];
                            const candidateGroup = candidateGroups.find((cg: any) => cg.id === g.id);
                            return sum + selectedIds.reduce((s: number, itemId: string) => {
                              const opt = candidateGroup?.options.find((o: any) => o.id === itemId);
                              return s + (opt?.additionalPrice || 0);
                            }, 0);
                          }, 0);
                          const estimatedFlavorPrice = p.price + sharedExtra;

                          const selectedBadges = sharedGroups.flatMap((g: any) =>
                            (selections[g.id] || []).map((itemId: string) => g.options.find((o: any) => o.id === itemId)?.name).filter(Boolean)
                          );

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (dragDist > 10) return;
                                setSecondHalfProductId(isSelected ? '' : p.id);
                              }}
                              style={{
                                flex: '0 0 calc(95% - 16px)',
                                minWidth: '360px',
                                scrollSnapAlign: 'start',
                                display: 'flex', gap: '14px', padding: '16px',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isSelected ? 'rgba(255,87,34,0.08)' : 'rgba(0,0,0,0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                alignItems: 'center',
                                userSelect: 'none'
                              }}
                            >
                              {img ? (
                                <img src={img} alt={p.name} draggable={false} style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: '84px', height: '84px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>🍕</div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 700, fontSize: '18px', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{p.name}</span>
                                {p.description && (
                                  <span style={{
                                    fontSize: '14px',
                                    color: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--text-muted)',
                                    lineHeight: '1.3'
                                  }}>
                                    {p.description}
                                  </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>R$ {formatCurrency(estimatedFlavorPrice)}</span>
                                  {selectedBadges.map((label, idx) => (
                                    <span key={idx} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div style={{ paddingLeft: '4px', flexShrink: 0 }}>
                                {isSelected ? (
                                  <CheckCircle2 size={28} color="var(--primary)" />
                                ) : (
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                                )}
                              </div>
                            </div>
                          );
                        })
                      }

                      {availableProducts.filter(p => p.categoryId === (product as any).categoryId && p.id !== product.id && p.name.toLowerCase().includes(searchHalf.toLowerCase())).filter(candidateOffersCurrentSharedSelection).length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)' }}>
                          Nenhum sabor disponível com as opções escolhidas{searchHalf ? ` para "${searchHalf}"` : ''}.
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', textAlign: 'center' }}>
                    💡 O valor da pizza meio a meio será calculado pelo sabor mais caro.
                  </div>

                  {secondHalfProductId && halfAndHalfExtraPrice > 0 && (
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--primary)', backgroundColor: 'rgba(255,87,34,0.1)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,87,34,0.2)', marginTop: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💰</span> O 2º sabor é mais caro. Diferença adicionada: + R$ {formatCurrency(halfAndHalfExtraPrice)}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

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
