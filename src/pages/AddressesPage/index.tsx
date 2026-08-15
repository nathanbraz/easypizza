import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { api, getTenantSlugFromUrl } from '../../lib/api';
import AddressForm from '../../components/AddressForm';
import '../OrderTrackerPage/OrderTrackerPage.css';
import '../../components/CheckoutModal/CheckoutModal.css';
import './AddressesPage.css';

export default function AddressesPage() {
  const navigate = useNavigate();
  const tenantSlug = getTenantSlugFromUrl();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editingAddress, setEditingAddress] = useState<any | null>(null);

  const fetchAddresses = async () => {
    try {
      const res = await api.get(`/customers/${tenantSlug}/addresses`);
      const data = res.data.data || res.data;
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar endereços', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaved = () => {
    setFormMode('closed');
    setEditingAddress(null);
    fetchAddresses();
  };

  const closeForm = () => {
    setFormMode('closed');
    setEditingAddress(null);
  };

  return (
    <div className="tracker-page">
      <header className="tracker-header glass-panel">
        <button className="back-btn" onClick={() => (formMode === 'closed' ? navigate('/') : closeForm())}>
          <ArrowLeft size={24} color="var(--primary)" />
        </button>
        <div className="tracker-header-info" style={{ flex: 1 }}>
          <h1>{formMode === 'edit' ? 'Editar Endereço' : formMode === 'new' ? 'Novo Endereço' : 'Meus Endereços'}</h1>
        </div>
      </header>

      <main className="tracker-content">
        {formMode !== 'closed' ? (
          <AddressForm
            tenantSlug={tenantSlug}
            addressId={formMode === 'edit' ? editingAddress?.id : undefined}
            initialAddress={formMode === 'edit' ? editingAddress : undefined}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div className="global-spinner" />
            Carregando seus endereços...
          </div>
        ) : (
          <>
            {addresses.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Nenhum endereço salvo ainda.</p>
              </div>
            ) : (
              <div className="address-list">
                {addresses.map((addr: any) => (
                  <div key={addr.id} className="address-card address-card-static">
                    <div className="address-card-header">
                      <strong>{addr.label || 'Endereço'}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {addr.isDefault && <span className="address-default-badge">Padrão</span>}
                        <button
                          className="address-edit-btn"
                          onClick={() => {
                            setEditingAddress(addr);
                            setFormMode('edit');
                          }}
                          title="Editar endereço"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                    <p>{addr.street}, {addr.number === 'SN' ? 'S/N' : addr.number} - {addr.neighborhood}</p>
                    <p className="address-card-city">{addr.city} - {addr.state}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
              onClick={() => setFormMode('new')}
            >
              <Plus size={18} /> Adicionar novo endereço
            </button>
          </>
        )}
      </main>
    </div>
  );
}
