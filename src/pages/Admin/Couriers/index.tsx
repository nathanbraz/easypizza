import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { api } from '../../../lib/api';
import '../Catalog/Catalog.css';

export default function CouriersManager() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string>('');
  
  // Validation state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const res = await api.get('/couriers');
      setCouriers(res.data);
    } catch (error) {
      console.error('Error loading couriers:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (item?: any) => {
    setEditingItem(item || null);
    setName(item?.name || '');
    setPhoneNumber(item?.phoneNumber || '');
    setVehiclePlate(item?.vehiclePlate || '');
    setErrors({});
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir o entregador?')) return;
    try {
      await api.delete(`/couriers/${id}`);
      loadData();
    } catch (error) {
      alert('Erro ao excluir entregador.');
    }
  };

  const handlePhoneChange = (val: string) => {
    // Simple mask for numbers only
    const digits = val.replace(/\D/g, '');
    setPhoneNumber(digits);
    if(errors.phoneNumber) setErrors({...errors, phoneNumber: ''});
  };

  const handlePlateChange = (val: string) => {
    setVehiclePlate(val.toUpperCase().substring(0, 7));
    if(errors.vehiclePlate) setErrors({...errors, vehiclePlate: ''});
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    
    // Validations
    let newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'O nome é obrigatório';
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'O telefone é obrigatório';
    else if (phoneNumber.length < 10) newErrors.phoneNumber = 'Telefone inválido (mínimo 10 dígitos)';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const formData = new FormData(e.currentTarget);
    
    try {
      setLoadingForm(true);
      const payload = {
        name,
        phoneNumber,
        vehiclePlate,
        isActive: formData.get('isActive') === 'on'
      };

      if (editingItem) {
        await api.put(`/couriers/${editingItem.id}`, payload);
      } else {
        await api.post('/couriers', payload);
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving courier:', error);
      setFormError('Erro ao salvar entregador. Tente novamente.');
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <div className="catalog-manager animate-fade-in">
      <header className="catalog-header">
        <h1>Entregadores (Motoboys)</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          Novo Entregador
        </button>
      </header>

      <main className="catalog-content glass-panel">
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Placa da Moto</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {couriers.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phoneNumber}</td>
                  <td>{c.vehiclePlate || '-'}</td>
                  <td>
                    {c.isActive ? (
                      <span className="status-badge" style={{ padding: '4px 8px' }}>Ativo</span>
                    ) : (
                      <span className="status-badge" style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Inativo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => openModal(c)}><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {couriers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum entregador cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '400px', padding: '24px', height: 'fit-content' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h2>{editingItem ? 'Editar' : 'Novo'} Entregador</h2>
              <button className="btn-icon" onClick={closeModal} type="button"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formError && <div className="form-alert error">{formError}</div>}
              
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  name="name" 
                  value={name}
                  onChange={e => { setName(e.target.value); if(errors.name) setErrors({...errors, name: ''}); }}
                  className={`form-input ${errors.name ? 'input-error' : ''}`} 
                  placeholder="Ex: João da Silva"
                />
                {errors.name && <span className="form-msg-error">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label>Telefone (Apenas números)</label>
                <input 
                  type="text" 
                  name="phoneNumber" 
                  value={phoneNumber}
                  onChange={e => handlePhoneChange(e.target.value)}
                  className={`form-input ${errors.phoneNumber ? 'input-error' : ''}`} 
                  placeholder="11999999999"
                  maxLength={11}
                />
                {errors.phoneNumber && <span className="form-msg-error">{errors.phoneNumber}</span>}
              </div>
              
              <div className="form-group">
                <label>Placa do Veículo (Opcional)</label>
                <input 
                  type="text" 
                  name="vehiclePlate" 
                  value={vehiclePlate}
                  onChange={e => handlePlateChange(e.target.value)}
                  className={`form-input ${errors.vehiclePlate ? 'input-error' : ''}`} 
                  placeholder="ABC1D23"
                />
              </div>
              
              {editingItem && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" name="isActive" defaultChecked={editingItem?.isActive} id="isActive" />
                  <label htmlFor="isActive" style={{ margin: 0 }}>Ativo no sistema</label>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }} disabled={loadingForm}>
                {loadingForm ? 'Salvando...' : 'Salvar Entregador'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
