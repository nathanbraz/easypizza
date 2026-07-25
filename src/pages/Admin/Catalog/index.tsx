import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../../../lib/api';
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll';
import './Catalog.css';

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState('produtos');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string>('');
  
  // Validation States
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estados extras para o Modal de Produto
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const tenantSlug = 'easypizza';
  
  useLockBodyScroll(isModalOpen);

  const loadData = async () => {
    try {
      const [catRes, prodRes, addRes] = await Promise.all([
        api.get(`/categories/${tenantSlug}`),
        api.get(`/products/${tenantSlug}`),
        api.get(`/addons/${tenantSlug}`)
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
      setAddons(addRes.data);
    } catch (error) {
      console.error('Error loading catalog data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: any) => {
    setEditingItem(item || null);
    setItemName(item?.name || '');
    setFormError('');
    setErrors({});
    
    if (activeTab === 'produtos') {
      setItemPrice(item ? String(item.price) : '');
      setPreviewImageUrls(item?.imageUrls || []);
      setIsAvailable(item ? item.isAvailable : true);
    } else if (activeTab === 'adicionais') {
      setItemPrice(item ? String(item.additionalPrice) : '');
    }
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setErrors({});
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    try {
      if (type === 'categoria') await api.delete(`/categories/${tenantSlug}/${id}`);
      if (type === 'produto') await api.delete(`/products/${tenantSlug}/${id}`);
      if (type === 'adicional') await api.delete(`/addons/${tenantSlug}/${id}`);
      loadData();
    } catch (error) {
      alert('Erro ao excluir item. Verifique dependências.');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    
    let newErrors: Record<string, string> = {};
    if (!itemName.trim()) newErrors.name = 'O nome é obrigatório';
    
    if (activeTab === 'produtos' || activeTab === 'adicionais') {
      const p = parseFloat(itemPrice);
      if (isNaN(p) || p < 0) {
        newErrors.price = 'O preço deve ser maior ou igual a zero';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    try {
      setLoadingForm(true);
      if (activeTab === 'categorias') {
        const payload = {
          name: itemName,
          displayOrder: parseInt(formData.get('displayOrder') as string) || 0
        };
        if (editingItem) await api.put(`/categories/${tenantSlug}/${editingItem.id}`, payload);
        else await api.post(`/categories/${tenantSlug}`, payload);
      } 
      else if (activeTab === 'produtos') {
        const payload = {
          name: itemName,
          description: formData.get('description'),
          price: parseFloat(itemPrice),
          categoryId: formData.get('categoryId'),
          imageUrls: previewImageUrls,
          isAvailable: isAvailable
        };
        if (editingItem) await api.put(`/products/${tenantSlug}/${editingItem.id}`, payload);
        else await api.post(`/products/${tenantSlug}`, payload);
      }
      else if (activeTab === 'adicionais') {
        const payload = {
          name: itemName,
          additionalPrice: parseFloat(itemPrice),
          categoryId: formData.get('categoryId')
        };
        if (editingItem) await api.put(`/addons/${tenantSlug}/${editingItem.id}`, payload);
        else await api.post(`/addons/${tenantSlug}`, payload);
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      setFormError('Erro ao salvar item. Verifique os dados.');
    } finally {
      setLoadingForm(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPreviewImageUrls(prev => [...prev, response.data.url]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao fazer upload da imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="catalog-manager animate-fade-in">
      <header className="catalog-header">
        <h1>Gestão de Cardápio</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          {activeTab === 'produtos' ? 'Novo Produto' : activeTab === 'categorias' ? 'Nova Categoria' : 'Novo Adicional'}
        </button>
      </header>

      <div className="catalog-tabs">
        <button className={`tab-btn ${activeTab === 'produtos' ? 'active' : ''}`} onClick={() => setActiveTab('produtos')}>Produtos</button>
        <button className={`tab-btn ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}>Categorias</button>
        <button className={`tab-btn ${activeTab === 'adicionais' ? 'active' : ''}`} onClick={() => setActiveTab('adicionais')}>Adicionais</button>
      </div>

      <main className="catalog-content glass-panel">
        {activeTab === 'produtos' && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço Base</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="product-cell">
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td>{cat?.name || 'Sem categoria'}</td>
                      <td>R$ {p.price?.toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" onClick={() => openModal(p)}><Edit2 size={16} /></button>
                          <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(p.id, 'produto')}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'categorias' && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome da Categoria</th>
                  <th>Ordem</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.displayOrder}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={() => openModal(c)}><Edit2 size={16} /></button>
                        <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(c.id, 'categoria')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {activeTab === 'adicionais' && (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome do Adicional</th>
                  <th>Preço Extra</th>
                  <th>Categoria Vinculada</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {addons.map(a => {
                  const cat = categories.find(c => c.id === a.categoryId);
                  return (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>+ R$ {a.additionalPrice?.toFixed(2)}</td>
                      <td>{cat?.name || 'Todas'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-icon" onClick={() => openModal(a)}><Edit2 size={16} /></button>
                          <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(a.id, 'adicional')}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className={`modal-content glass-panel ${activeTab === 'produtos' ? 'modal-wide' : ''}`} style={{ width: '400px', padding: '24px', height: 'fit-content' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2>{editingItem ? 'Editar' : (activeTab === 'categorias' ? 'Nova' : 'Novo')} {activeTab === 'categorias' ? 'Categoria' : activeTab === 'adicionais' ? 'Adicional' : 'Produto'}</h2>
              <button className="btn-icon" onClick={closeModal} type="button"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && <div className="form-alert error">{formError}</div>}
              
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  name="name" 
                  value={itemName}
                  onChange={e => { setItemName(e.target.value); if(errors.name) setErrors({...errors, name: ''}); }}
                  className={`form-input ${errors.name ? 'input-error' : ''}`} 
                  placeholder="Ex: Pizza Calabresa"
                />
                {errors.name && <span className="form-msg-error">{errors.name}</span>}
              </div>

              {activeTab === 'categorias' && (
                <div className="form-group">
                  <label>Ordem de Exibição</label>
                  <input type="number" name="displayOrder" defaultValue={editingItem?.displayOrder || 0} required className="form-input" />
                </div>
              )}

              {activeTab === 'produtos' && (
                <div className="product-form-grid">
                  <div className="image-preview-container">
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                      Fotos do Produto ({previewImageUrls.length})
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                      {previewImageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <img src={url} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => setPreviewImageUrls(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {previewImageUrls.length === 0 && (
                        <div className="placeholder" style={{ gridColumn: '1 / -1', height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.2)' }}>
                          <ImageIcon size={32} opacity={0.5} style={{ marginBottom: '8px' }} />
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem imagens</span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label htmlFor="image-upload" className="btn-secondary" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {uploadingImage ? 'Enviando...' : 'Tirar Foto ou Escolher Arquivo'}
                      </label>
                      <input 
                        id="image-upload"
                        type="file" 
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingImage}
                      />
                      <input 
                        type="url" 
                        placeholder="Ou cole a URL da imagem e aperte Enter" 
                        className="form-input" 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              setPreviewImageUrls(prev => [...prev, val]);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                        style={{ marginTop: '4px' }}
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginTop: '16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ margin: 0 }}>Produto Ativo no Cardápio?</label>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={isAvailable}
                          onChange={(e) => setIsAvailable(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label>Categoria</label>
                      <select name="categoryId" defaultValue={editingItem?.categoryId} required className="form-input">
                        <option value="">Selecione a categoria...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Descrição</label>
                      <textarea name="description" defaultValue={editingItem?.description} className="form-input" rows={4} placeholder="Ingredientes e detalhes..."></textarea>
                    </div>
                    <div className="form-group">
                      <label>Preço</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '0 12px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)' }} className={`form-input-wrapper ${errors.price ? 'input-error' : ''}`}>
                        <span style={{ color: 'var(--text-muted)' }}>R$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          name="price" 
                          value={itemPrice}
                          onChange={e => { setItemPrice(e.target.value); if(errors.price) setErrors({...errors, price: ''}); }}
                          style={{ border: 'none', padding: '10px 0', flex: 1, boxShadow: 'none', background: 'transparent', color: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                        />
                      </div>
                      {errors.price && <span className="form-msg-error">{errors.price}</span>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'adicionais' && (
                <>
                  <div className="form-group">
                    <label>Categoria Vinculada</label>
                    <select name="categoryId" defaultValue={editingItem?.categoryId} required className="form-input">
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Preço Adicional</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '0 12px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)' }} className={`form-input-wrapper ${errors.price ? 'input-error' : ''}`}>
                      <span style={{ color: 'var(--text-muted)' }}>R$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        name="additionalPrice" 
                        value={itemPrice}
                        onChange={e => { setItemPrice(e.target.value); if(errors.price) setErrors({...errors, price: ''}); }}
                        style={{ border: 'none', padding: '10px 0', flex: 1, boxShadow: 'none', background: 'transparent', color: '#f8fafc', outline: 'none', fontSize: '15px' }} 
                      />
                    </div>
                    {errors.price && <span className="form-msg-error">{errors.price}</span>}
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }} disabled={loadingForm}>
                {loadingForm ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
