import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '../../lib/api';

interface AddressFormProps {
  tenantSlug: string;
  // Presente = modo edição (PUT nesse endereço); ausente = modo criação (POST de um novo)
  addressId?: string;
  initialAddress?: any;
  onSaved: (address: any) => void;
  onCancel: () => void;
}

export default function AddressForm({ tenantSlug, addressId, initialAddress, onSaved, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState(initialAddress?.label || '');
  const [cep, setCep] = useState(() => {
    const raw = (initialAddress?.zipCode || '').replace(/\D/g, '');
    if (raw.length > 5) return raw.substring(0, 5) + '-' + raw.substring(5, 8);
    return raw;
  });
  const [isNoNumber, setIsNoNumber] = useState(initialAddress?.number === 'SN');
  const [address, setAddress] = useState({
    street: initialAddress?.street || '',
    number: initialAddress?.number && initialAddress.number !== 'SN' ? initialAddress.number : '',
    neighborhood: initialAddress?.neighborhood || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    referencePoint: initialAddress?.complement ? initialAddress.complement.replace('Ref: ', '') : ''
  });
  const [latitude, setLatitude] = useState<number | null>(initialAddress?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialAddress?.longitude ?? null);
  const [locationStatus, setLocationStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Cidade e UF só são preenchidas automaticamente pelo CEP — o cliente não digita elas na mão,
  // pra evitar cidade/UF inconsistente com o CEP informado.
  const fetchAddressByCep = async (cepCode: string) => {
    if (cepCode.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepCode}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setAddress((prev) => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || '',
            state: data.uf || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP', error);
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocalização não é suportada no seu navegador');
      return;
    }
    setLocationStatus('Buscando...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationStatus('📍 Localização capturada com sucesso!');
      },
      () => setLocationStatus('Não foi possível capturar a localização.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!address.street || (!address.number && !isNoNumber) || !address.neighborhood) {
      alert('Por favor, preencha a rua, número e bairro do endereço.');
      return;
    }
    if (!address.city || !address.state) {
      alert('Informe um CEP válido para preencher cidade e UF automaticamente.');
      return;
    }

    const payload = {
      label: label || null,
      street: address.street,
      number: isNoNumber ? 'SN' : address.number,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: cep || '00000000',
      complement: address.referencePoint ? `Ref: ${address.referencePoint}` : '',
      latitude,
      longitude
    };

    try {
      setSaving(true);
      const res = addressId
        ? await api.put(`/customers/${tenantSlug}/addresses/${addressId}`, payload)
        : await api.post(`/customers/${tenantSlug}/addresses`, payload);
      const saved = res.data.data || res.data;
      onSaved(saved);
    } catch (err) {
      console.error('Erro ao salvar endereço', err);
      alert('Não foi possível salvar o endereço. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="checkout-section">
      <div className="form-group">
        <label>Nome do endereço (opcional)</label>
        <input type="text" placeholder="Ex: Casa, Trabalho" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>

      <div className="form-group">
        <label>CEP</label>
        <div className="input-with-icon">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="00000-000"
            value={cep}
            maxLength={9}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 5) val = val.substring(0, 5) + '-' + val.substring(5, 8);
              setCep(val);
              if (val.replace(/\D/g, '').length === 8) fetchAddressByCep(val.replace(/\D/g, ''));
            }}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label>Rua</label>
          <input type="text" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 1.2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ margin: 0 }}>Número</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: isNoNumber ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isNoNumber ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>Sem Nº</span>
              <label className="custom-toggle">
                <input type="checkbox" checked={isNoNumber} onChange={(e) => setIsNoNumber(e.target.checked)} />
                <span className="custom-toggle-slider"></span>
              </label>
            </div>
          </div>
          <input
            type="text"
            disabled={isNoNumber}
            value={isNoNumber ? 'SN' : address.number}
            onChange={(e) => setAddress({ ...address, number: e.target.value })}
            style={isNoNumber ? { opacity: 0.7 } : {}}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ flex: 2 }}>
          <label>Bairro</label>
          <input type="text" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
        </div>
        <div className="form-group" style={{ flex: 2 }}>
          <label>Cidade</label>
          <input type="text" value={address.city} disabled placeholder="Preenchido pelo CEP" style={{ opacity: 0.7, cursor: 'not-allowed' }} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>UF</label>
          <input type="text" value={address.state} disabled placeholder="—" style={{ opacity: 0.7, cursor: 'not-allowed', textTransform: 'uppercase' }} />
        </div>
      </div>

      <div className="form-group">
        <label>Ponto de Referência (Opcional)</label>
        <input type="text" placeholder="Ex: Próximo ao supermercado" value={address.referencePoint} onChange={(e) => setAddress({ ...address, referencePoint: e.target.value })} />
      </div>

      <div className="form-group" style={{ marginTop: '16px' }}>
        <button type="button" className="secondary-button" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleGetLocation}>
          <MapPin size={18} /> Usar minha localização atual
        </button>
        {locationStatus && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: locationStatus.includes('sucesso') ? '#22c55e' : 'var(--primary)' }}>
            {locationStatus}
          </div>
        )}
        {latitude && longitude && (
          <div className="map-preview" style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <iframe
              width="100%"
              height="200"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=pt-BR&z=15&output=embed`}
            ></iframe>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="button" className="primary-button" style={{ flex: 1, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Endereço'}
        </button>
      </div>
    </section>
  );
}
