import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../utils/formatCurrency';

interface CategoryOptionsModalProps {
  category: any;
  // Produtos já cadastrados nesta categoria — usados só pra montar o seletor de sabores quando o
  // grupo ativo é o de Sabores (o item aponta pra um Produto real, não é digitado à mão).
  categoryProducts: any[];
  tenantSlug: string;
  onClose: () => void;
}

const FLAVOR_STRATEGIES = [
  { value: 0, label: 'Mais caro', hint: 'Cobra o preço do sabor mais caro escolhido' },
  { value: 1, label: 'Soma', hint: 'Soma o preço de cada sabor escolhido' },
  { value: 2, label: 'Média', hint: 'Faz a média entre os sabores escolhidos' },
  { value: 3, label: 'Mais barato', hint: 'Cobra o preço do sabor mais barato escolhido' }
];

// Gerencia os grupos/itens compartilhados por TODA a categoria (Tamanho, Borda). Diferente das
// "Opções do Produto" (Adicionais extras), essas definições existem uma única vez por categoria —
// cada produto só escolhe quais itens oferece e a que preço (isso é feito no modal de opções do
// próprio produto, não aqui).
export default function CategoryOptionsModal({ category, categoryProducts, tenantSlug, onClose }: CategoryOptionsModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMin, setGroupMin] = useState(1);
  const [groupMax, setGroupMax] = useState(1);
  const [groupDisplayOrder, setGroupDisplayOrder] = useState(0);
  const [groupHasUniformPricing, setGroupHasUniformPricing] = useState(false);
  const [groupIsFlavorGroup, setGroupIsFlavorGroup] = useState(false);
  const [groupFlavorPriceStrategy, setGroupFlavorPriceStrategy] = useState(0);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemName, setItemName] = useState('');
  const [itemDisplayOrder, setItemDisplayOrder] = useState(0);
  const [itemUniformPrice, setItemUniformPrice] = useState('0');
  const [itemProductId, setItemProductId] = useState('');

  // Grupo dono do item que está sendo criado/editado no momento — usado só pra saber se mostra o
  // campo de preço uniforme no formulário do item (só faz sentido se o grupo for de preço uniforme).
  const activeGroup = groups.find(g => g.id === activeGroupId);

  useEffect(() => {
    loadGroups();
  }, [category.id]);

  // `silent`: recarrega sem trocar a lista inteira por um spinner — usado depois de qualquer
  // edição, senão o conteúdo encolhia por um instante e a rolagem do modal voltava pro topo.
  const loadGroups = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/categoryoptions/${tenantSlug}/category/${category.id}`);
      setGroups(res.data);
    } catch (error) {
      console.error('Error loading category options:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const openGroupForm = (group?: any) => {
    setEditingGroup(group || null);
    setGroupName(group?.name || '');
    setGroupMin(group ? group.minChoices : 1);
    setGroupMax(group ? group.maxChoices : 1);
    setGroupDisplayOrder(group?.displayOrder || 0);
    setGroupHasUniformPricing(group?.hasUniformPricing || false);
    setGroupIsFlavorGroup(group?.isFlavorGroup || false);
    setGroupFlavorPriceStrategy(group?.flavorPriceStrategy ?? 0);
    setIsGroupFormOpen(true);
  };

  // Só pode existir um grupo de Sabores por categoria (o mesmo produto não pode aparecer como
  // sabor extra em dois grupos diferentes — o backend também valida isso).
  const hasOtherFlavorGroup = groups.some(g => g.isFlavorGroup && g.id !== editingGroup?.id);

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: groupName,
      minChoices: groupMin,
      maxChoices: groupMax,
      displayOrder: groupDisplayOrder,
      hasUniformPricing: groupIsFlavorGroup ? false : groupHasUniformPricing,
      isFlavorGroup: groupIsFlavorGroup,
      flavorPriceStrategy: groupFlavorPriceStrategy
    };

    try {
      if (editingGroup) {
        await api.put(`/categoryoptions/${tenantSlug}/group/${editingGroup.id}`, payload);
      } else {
        await api.post(`/categoryoptions/${tenantSlug}/category/${category.id}`, payload);
      }
      setIsGroupFormOpen(false);
      loadGroups(true);
    } catch (error) {
      alert('Erro ao salvar grupo.');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!window.confirm('Excluir este grupo e todas as suas opções? Isso remove também o preço definido em todos os produtos que o utilizam.')) return;
    try {
      await api.delete(`/categoryoptions/${tenantSlug}/group/${id}`);
      loadGroups(true);
    } catch (error) {
      alert('Erro ao excluir grupo.');
    }
  };

  const openItemForm = (groupId: string, item?: any) => {
    setActiveGroupId(groupId);
    setEditingItem(item || null);
    setItemName(item?.name || '');
    setItemDisplayOrder(item?.displayOrder || 0);
    setItemUniformPrice(item ? String(item.uniformPrice ?? 0) : '0');
    setItemProductId(item?.productId || '');
    setIsItemFormOpen(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId) return;

    const linkedProduct = activeGroup?.isFlavorGroup ? categoryProducts.find(p => p.id === itemProductId) : null;
    if (activeGroup?.isFlavorGroup && !linkedProduct) {
      alert('Escolha um produto para representar o sabor.');
      return;
    }

    const payload = {
      name: activeGroup?.isFlavorGroup ? linkedProduct!.name : itemName,
      displayOrder: itemDisplayOrder,
      uniformPrice: activeGroup?.hasUniformPricing ? (parseFloat(itemUniformPrice.replace(',', '.')) || 0) : null,
      productId: activeGroup?.isFlavorGroup ? itemProductId : null
    };

    try {
      if (editingItem) {
        await api.put(`/categoryoptions/${tenantSlug}/item/${editingItem.id}`, payload);
      } else {
        await api.post(`/categoryoptions/${tenantSlug}/group/${activeGroupId}/items`, payload);
      }
      setIsItemFormOpen(false);
      loadGroups(true);
    } catch (error) {
      alert('Erro ao salvar opção.');
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Excluir esta opção? Isso remove também o preço definido em todos os produtos que a oferecem.')) return;
    try {
      await api.delete(`/categoryoptions/${tenantSlug}/item/${id}`);
      loadGroups(true);
    } catch (error) {
      alert('Erro ao excluir opção.');
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel modal-wide" style={{ width: '800px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          <button className="modal-close" style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}><X size={24} /></button>
          <div style={{ paddingRight: '40px' }}>
            <h2 style={{ margin: 0 }}>Opções da Categoria: {category.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Tamanho, Borda etc. — definidos uma única vez aqui e compartilhados por todos os produtos desta categoria.
              Em cada produto você escolhe quais dessas opções ele oferece e a que preço.
            </p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', padding: '40px 0' }}>
              <div className="global-spinner" />
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando opções...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Grupos da Categoria</h3>
                <button className="btn-primary" onClick={() => openGroupForm()}>
                  <Plus size={16} /> Novo Grupo
                </button>
              </div>

              {groups.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Esta categoria ainda não tem Tamanho, Borda ou outro grupo compartilhado.</p>
                </div>
              )}

              {groups.map(g => (
                <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {g.name}
                        {g.hasUniformPricing && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                            Preço uniforme
                          </span>
                        )}
                        {g.isFlavorGroup && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                            🌗 Sabores ({FLAVOR_STRATEGIES.find(s => s.value === g.flavorPriceStrategy)?.label})
                          </span>
                        )}
                      </h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                        O cliente escolhe entre {g.minChoices} e {g.maxChoices} opção(ões)
                        {g.hasUniformPricing && ' • mesmo preço em todos os produtos'}
                        {g.isFlavorGroup && ' sabor(es) extra(s) — habilita o Meio a Meio nesta categoria'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => openItemForm(g.id)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                        <Plus size={14} /> Adicionar Opção
                      </button>
                      <button className="btn-icon" onClick={() => openGroupForm(g)}><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => deleteGroup(g.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <div style={{ padding: '16px' }}>
                    {g.items?.length === 0 ? (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Nenhuma opção cadastrada neste grupo.</p>
                    ) : (
                      <table className="admin-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Opção</th>
                            {g.hasUniformPricing && <th>Preço</th>}
                            <th style={{ width: '80px' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it: any) => (
                            <tr key={it.id}>
                              <td>{it.name}</td>
                              {g.hasUniformPricing && <td>R$ {formatCurrency(it.uniformPrice ?? 0)}</td>}
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn-icon" onClick={() => openItemForm(g.id, it)}><Edit2 size={14} /></button>
                                  <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => deleteItem(it.id)}><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isGroupFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content glass-panel" style={{ width: '450px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsGroupFormOpen(false)}><X size={20} /></button>
            <h3 style={{ marginTop: 0, marginBottom: '8px', paddingRight: '24px' }}>{editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Ex: "Tamanho" com as opções "P", "M", "G"; ou "Borda" com "Sem borda", "Catupiry", "Cheddar".
            </p>
            <form onSubmit={saveGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Nome do Grupo</label>
                <input type="text" className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Tamanho" required />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>Mín. de opções</label>
                  <input type="number" className="form-input" value={groupMin} onChange={e => setGroupMin(parseInt(e.target.value))} min="0" required />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>Máx. de opções</label>
                  <input type="number" className="form-input" value={groupMax} onChange={e => setGroupMax(parseInt(e.target.value))} min="1" required />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Use mín=1 e máx=1 para "o cliente escolhe exatamente uma opção" (o caso normal de Tamanho e Borda).
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px' }}>Ordem de Exibição</label>
                <input type="number" className="form-input" value={groupDisplayOrder} onChange={e => setGroupDisplayOrder(parseInt(e.target.value))} required />
              </div>
              {!groupIsFlavorGroup && (
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ margin: 0 }}>Preço uniforme entre produtos?</label>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ative se o preço de cada opção é sempre o mesmo, não importa o produto (ex: Borda). Você define o preço uma vez aqui, e cada produto só liga/desliga se oferece. Desative se o preço varia por produto (ex: Tamanho).
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={groupHasUniformPricing} onChange={(e) => setGroupHasUniformPricing(e.target.checked)} />
                    <span className="slider"></span>
                  </label>
                </div>
              )}
              <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ margin: 0 }}>É o grupo de Sabores?</label>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Ative pra este ser o grupo que habilita "Meio a Meio" nesta categoria — os itens dele apontam pra produtos já cadastrados (não digita nome/preço). Só um grupo de Sabores por categoria.
                  </span>
                  {hasOtherFlavorGroup && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>Esta categoria já tem um grupo de Sabores ({groups.find(g => g.isFlavorGroup)?.name}).</span>
                  )}
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={groupIsFlavorGroup} disabled={hasOtherFlavorGroup} onChange={(e) => setGroupIsFlavorGroup(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              {groupIsFlavorGroup && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px' }}>Como calcular o preço da combinação?</label>
                  <select className="form-input" value={groupFlavorPriceStrategy} onChange={(e) => setGroupFlavorPriceStrategy(parseInt(e.target.value))}>
                    {FLAVOR_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label} — {s.hint}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsGroupFormOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsItemFormOpen(false)}><X size={20} /></button>
            <h3 style={{ marginTop: 0, paddingRight: '24px' }}>{editingItem ? 'Editar Opção' : 'Nova Opção'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              {activeGroup?.isFlavorGroup
                ? 'Escolha qual produto já cadastrado nesta categoria representa este sabor — nome e foto seguem o produto escolhido.'
                : activeGroup?.hasUniformPricing
                ? 'Este grupo tem preço uniforme — o preço definido aqui vale pra todo produto que oferecer esta opção.'
                : 'O preço fica a cargo de cada produto (defina em "Gerenciar Opções" no produto).'}
            </p>
            <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeGroup?.isFlavorGroup ? (
                <div className="form-group">
                  <label>Produto (sabor)</label>
                  <select className="form-input" value={itemProductId} onChange={e => setItemProductId(e.target.value)} required>
                    <option value="" disabled>Selecione um produto...</option>
                    {categoryProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {categoryProducts.length === 0 && (
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>Nenhum produto cadastrado nesta categoria ainda.</span>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label>Nome da Opção</label>
                  <input type="text" className="form-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: G (8 fatias)" required />
                </div>
              )}
              {activeGroup?.hasUniformPricing && (
                <div className="form-group">
                  <label>Preço</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '0 12px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemUniformPrice}
                      onChange={e => setItemUniformPrice(e.target.value)}
                      style={{ border: 'none', padding: '10px 0', flex: 1, boxShadow: 'none', background: 'transparent', color: '#f8fafc', outline: 'none', fontSize: '15px' }}
                    />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>Ordem de Exibição</label>
                <input type="number" className="form-input" value={itemDisplayOrder} onChange={e => setItemDisplayOrder(parseInt(e.target.value))} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsItemFormOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Opção</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
