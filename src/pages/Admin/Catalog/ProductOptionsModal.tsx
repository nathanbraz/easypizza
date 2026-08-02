import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../utils/formatCurrency';

interface ProductOptionsModalProps {
  product: any;
  tenantSlug: string;
  onClose: () => void;
}

export default function ProductOptionsModal({ product, tenantSlug, onClose }: ProductOptionsModalProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group Form State
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'single' | 'multiple' | 'counter'>('single');
  const [groupMin, setGroupMin] = useState(0);
  const [groupMax, setGroupMax] = useState(1);
  const [groupDisplayOrder, setGroupDisplayOrder] = useState(0);

  // Item Form State
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('0');
  const [itemDisplayOrder, setItemDisplayOrder] = useState(0);

  // Copy Options State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [selectedProductIdToCopy, setSelectedProductIdToCopy] = useState<string>('');
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    loadOptions();
  }, [product.id]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/productoptions/${tenantSlug}/product/${product.id}`);
      setGroups(res.data);
    } catch (error) {
      console.error('Error loading product options:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isSingle = groupType === 'single';
    const isCounter = groupType === 'counter';
    const finalMin = isSingle ? 1 : groupMin;
    const finalMax = isSingle ? 1 : groupMax;
    const isRequired = isSingle ? true : finalMin > 0;

    const payload = {
      name: groupName,
      groupType: groupType,
      isRequired: isRequired,
      minChoices: finalMin,
      maxChoices: isCounter ? 99 : finalMax, // contador sem limite fixo
      displayOrder: groupDisplayOrder
    };

    try {
      if (editingGroup) {
        await api.put(`/productoptions/${tenantSlug}/group/${editingGroup.id}`, payload);
      } else {
        await api.post(`/productoptions/${tenantSlug}/product/${product.id}`, payload);
      }
      setIsGroupFormOpen(false);
      loadOptions();
    } catch (error) {
      alert('Erro ao salvar grupo.');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!window.confirm('Excluir este grupo e todas as suas opções?')) return;
    try {
      await api.delete(`/productoptions/${tenantSlug}/group/${id}`);
      loadOptions();
    } catch (error) {
      alert('Erro ao excluir grupo.');
    }
  };

  const openGroupForm = (group?: any) => {
    setEditingGroup(group || null);
    setGroupName(group?.name || '');
    if (group) {
      setGroupType(group.groupType ?? (group.maxChoices === 1 && group.minChoices === 1 ? 'single' : 'multiple'));
      setGroupMin(group.minChoices || 0);
      setGroupMax(group.maxChoices || 10);
      setGroupDisplayOrder(group.displayOrder || 0);
    } else {
      setGroupType('single');
      setGroupMin(0);
      setGroupMax(10);
      setGroupDisplayOrder(0);
    }
    setIsGroupFormOpen(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId) return;

    const payload = {
      name: itemName,
      additionalPrice: parseFloat(itemPrice) || 0,
      displayOrder: itemDisplayOrder
    };

    try {
      if (editingItem) {
        await api.put(`/productoptions/${tenantSlug}/item/${editingItem.id}`, payload);
      } else {
        await api.post(`/productoptions/${tenantSlug}/group/${activeGroupId}/items`, payload);
      }
      setIsItemFormOpen(false);
      loadOptions();
    } catch (error) {
      alert('Erro ao salvar opção.');
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Excluir esta opção?')) return;
    try {
      await api.delete(`/productoptions/${tenantSlug}/item/${id}`);
      loadOptions();
    } catch (error) {
      alert('Erro ao excluir opção.');
    }
  };

  const openItemForm = (groupId: string, item?: any) => {
    setActiveGroupId(groupId);
    setEditingItem(item || null);
    setItemName(item?.name || '');
    setItemPrice(item ? String(item.additionalPrice) : '0');
    setItemDisplayOrder(item?.displayOrder || 0);
    setIsItemFormOpen(true);
  };

  const openCopyModal = async () => {
    try {
      const res = await api.get(`/products/${tenantSlug}`);
      // Filter out the current product
      setAllProducts(res.data.filter((p: any) => p.id !== product.id));
      setIsCopyModalOpen(true);
    } catch (error) {
      alert('Erro ao carregar produtos.');
    }
  };

  const handleCopyOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductIdToCopy) return;

    try {
      setIsCopying(true);
      // 1. Get options from source product
      const res = await api.get(`/productoptions/${tenantSlug}/product/${selectedProductIdToCopy}`);
      const sourceGroups = res.data;

      // 2. Clone them to the current product
      for (const group of sourceGroups) {
        const groupPayload = {
          name: group.name,
          groupType: group.groupType || 'single',
          isRequired: group.isRequired,
          minChoices: group.minChoices,
          maxChoices: group.maxChoices,
          displayOrder: group.displayOrder
        };
        const newGroupRes = await api.post(`/productoptions/${tenantSlug}/product/${product.id}`, groupPayload);
        const newGroupId = newGroupRes.data.id;

        for (const item of group.options) {
          const itemPayload = {
            name: item.name,
            additionalPrice: item.additionalPrice,
            displayOrder: item.displayOrder
          };
          await api.post(`/productoptions/${tenantSlug}/group/${newGroupId}/items`, itemPayload);
        }
      }

      setIsCopyModalOpen(false);
      loadOptions();
    } catch (error) {
      console.error(error);
      alert('Erro ao copiar opções.');
    } finally {
      setIsCopying(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel modal-wide" style={{ width: '800px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
          <button className="modal-close" style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={onClose}><X size={24} /></button>
          <div style={{ paddingRight: '40px' }}>
            <h2 style={{ margin: 0 }}>Opções: {product.name}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Crie tamanhos, pontos de carne, adicionais específicos para este produto.
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
                <h3 style={{ margin: 0 }}>Opções do Produto</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={openCopyModal}>
                    Copiar de outro produto
                  </button>
                  <button className="btn-primary" onClick={() => openGroupForm()}>
                    <Plus size={16} /> Nova Seção
                  </button>
                </div>
              </div>

              {groups.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Este produto não possui opções personalizadas.</p>
                </div>
              )}

              {groups.map(g => (
                <div key={g.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px' }}>{g.name}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                        {g.isRequired ? 'Obrigatório' : 'Opcional'} • Mín: {g.minChoices} • Máx: {g.maxChoices}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" onClick={() => openItemForm(g.id)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                        <Plus size={14} /> Adicionar Escolha
                      </button>
                      <button className="btn-icon" onClick={() => openGroupForm(g)}><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => deleteGroup(g.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  
                  <div style={{ padding: '16px' }}>
                    {g.options?.length === 0 ? (
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Nenhuma opção cadastrada neste grupo.</p>
                    ) : (
                      <table className="admin-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th>Opção</th>
                            <th>Preço Adicional</th>
                            <th style={{ width: '80px' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.options.map((opt: any) => (
                            <tr key={opt.id}>
                              <td>{opt.name}</td>
                              <td>+ R$ {formatCurrency(opt.additionalPrice)}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn-icon" onClick={() => openItemForm(g.id, opt)}><Edit2 size={14} /></button>
                                  <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => deleteItem(opt.id)}><Trash2 size={14} /></button>
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
          <div className="modal-content glass-panel" style={{ width: '500px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsGroupFormOpen(false)}><X size={20} /></button>
            <h3 style={{ marginTop: 0, marginBottom: '8px', paddingRight: '24px' }}>{editingGroup ? 'Editar Seção' : 'Nova Seção (Grupo de Opções)'}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Uma seção agrupa várias opções. Exemplo: "Escolha o Tamanho" terá dentro dela as opções "Pequena", "Média", etc.
            </p>
            <form onSubmit={saveGroup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="form-group">
                <label>Título para o Cliente (Nome da Seção)</label>
                <input type="text" className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ex: Escolha o Tamanho da Pizza" required />
              </div>
              
              <div className="form-group">
                <label>Tipo de Escolha</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* TIPO 1: Seleção Única */}
                  <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', background: groupType === 'single' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${groupType === 'single' ? '#f97316' : 'rgba(255,255,255,0.1)'}`, padding: '12px', borderRadius: '8px' }}>
                    <input type="radio" name="groupType" value="single" checked={groupType === 'single'} onChange={() => setGroupType('single')} style={{ marginTop: '2px', accentColor: '#f97316', outline: 'none', boxShadow: 'none' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: groupType === 'single' ? '#f97316' : '#fff' }}>🔘 Seleção Única (Obrigatória)</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>O cliente escolhe apenas UMA opção. Ideal para Tamanhos, Bordas, Ponto da Carne.</span>
                    </div>
                  </label>

                  {/* TIPO 2: Múltipla Escolha */}
                  <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', background: groupType === 'multiple' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${groupType === 'multiple' ? '#f97316' : 'rgba(255,255,255,0.1)'}`, padding: '12px', borderRadius: '8px' }}>
                    <input type="radio" name="groupType" value="multiple" checked={groupType === 'multiple'} onChange={() => setGroupType('multiple')} style={{ marginTop: '2px', accentColor: '#f97316', outline: 'none', boxShadow: 'none' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: groupType === 'multiple' ? '#f97316' : '#fff' }}>☑️ Múltipla Escolha Simples</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>O cliente pode marcar vários. Ideal para "Retirar Ingredientes" ou "Incluir Extras".</span>
                    </div>
                  </label>

                  {/* TIPO 3: Adicionais por Quantidade (Contador) */}
                  <label style={{ display: 'flex', gap: '12px', cursor: 'pointer', background: groupType === 'counter' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${groupType === 'counter' ? '#f97316' : 'rgba(255,255,255,0.1)'}`, padding: '12px', borderRadius: '8px' }}>
                    <input type="radio" name="groupType" value="counter" checked={groupType === 'counter'} onChange={() => setGroupType('counter')} style={{ marginTop: '2px', accentColor: '#f97316', outline: 'none', boxShadow: 'none' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: groupType === 'counter' ? '#f97316' : '#fff' }}>🔢 Adicionais por Quantidade (Contador)</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>O cliente usa botões + e - para pedir quantidades. Ideal para Bacon 3x, Queijo 2x, etc.</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* Opções de min/max somente para Múltipla Escolha */}
              {groupType === 'multiple' && (
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label style={{ fontSize: '12px' }}>Mín. de opções selecionadas</label>
                    <input type="number" className="form-input" value={groupMin} onChange={e => setGroupMin(parseInt(e.target.value))} min="0" required />
                  </div>
                  <div className="form-group" style={{ flex: 1, margin: 0 }}>
                    <label style={{ fontSize: '12px' }}>Máx. de opções selecionadas</label>
                    <input type="number" className="form-input" value={groupMax} onChange={e => setGroupMax(parseInt(e.target.value))} min="1" required />
                  </div>
                </div>
              )}

              {/* Limite de quantidade para Contador */}
              {groupType === 'counter' && (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px' }}>Máx. total de itens que o cliente pode pedir</label>
                    <input type="number" className="form-input" value={groupMax} onChange={e => setGroupMax(parseInt(e.target.value))} min="1" placeholder="Ex: 5" required />
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Exemplo: "5" permite o cliente pedir até 5 unidades somando todos os itens.</p>
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px' }}>Ordem de Exibição</label>
                <input type="number" className="form-input" value={groupDisplayOrder} onChange={e => setGroupDisplayOrder(parseInt(e.target.value))} required />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Use números menores para aparecer primeiro (ex: 1, 2, 3).</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsGroupFormOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Seção</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemFormOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content glass-panel" style={{ width: '400px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsItemFormOpen(false)}><X size={20} /></button>
            <h3 style={{ marginTop: 0, paddingRight: '24px' }}>{editingItem ? 'Editar Escolha' : 'Nova Escolha'}</h3>
            <form onSubmit={saveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Nome da Escolha</label>
                <input type="text" className="form-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Ex: Grande" required />
              </div>
              
              <div className="form-group">
                <label>Preço Adicional / Preço Final</label>
                <input type="number" step="0.01" className="form-input" value={itemPrice} onChange={e => setItemPrice(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Ordem de Exibição</label>
                <input type="number" className="form-input" value={itemDisplayOrder} onChange={e => setItemDisplayOrder(parseInt(e.target.value))} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsItemFormOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar Escolha</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCopyModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content glass-panel" style={{ width: '500px', padding: '24px', position: 'relative' }}>
            <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setIsCopyModalOpen(false)}><X size={20} /></button>
            <h3 style={{ marginTop: 0, paddingRight: '24px' }}>Copiar Opções de Outro Produto</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
              Selecione de qual produto você deseja copiar os Tamanhos e Adicionais. Isso substituirá as opções atuais caso existam (ou as adicionará).
            </p>
            <form onSubmit={handleCopyOptions} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Produto de Origem</label>
                <select 
                  className="form-input" 
                  value={selectedProductIdToCopy} 
                  onChange={e => setSelectedProductIdToCopy(e.target.value)} 
                  required
                >
                  <option value="">Selecione um produto...</option>
                  {allProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsCopyModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isCopying || !selectedProductIdToCopy}>
                  {isCopying ? 'Copiando...' : 'Copiar Opções'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
