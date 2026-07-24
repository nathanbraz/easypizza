import React, { useState } from 'react';
import './Settings.css';

export default function SettingsManager() {
  const [storeOpen, setStoreOpen] = useState(true);
  const [pixEnabled, setPixEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [cashEnabled, setCashEnabled] = useState(true);

  return (
    <div className="settings-manager animate-fade-in">
      <header className="settings-header">
        <h1>Configurações da Loja</h1>
      </header>

      <div className="settings-grid">
        <div className="settings-card glass-panel">
          <h3>Operação</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Loja Aberta</span>
              <span className="setting-desc">Habilite para receber novos pedidos</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={storeOpen} onChange={(e) => setStoreOpen(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>
          
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Horário Automático</span>
              <span className="setting-desc">Abre e fecha a loja no horário programado</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-card glass-panel">
          <h3>Formas de Pagamento</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Pix</span>
              <span className="setting-desc">Pagamento instantâneo</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={pixEnabled} onChange={(e) => setPixEnabled(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Cartão na Entrega</span>
              <span className="setting-desc">Motoboy leva a maquininha</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={cardEnabled} onChange={(e) => setCardEnabled(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Dinheiro</span>
              <span className="setting-desc">Permite solicitar troco</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={cashEnabled} onChange={(e) => setCashEnabled(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-card glass-panel">
          <h3>Taxas e Entrega</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Taxa Padrão de Entrega</span>
              <span className="setting-desc">R$ 5,00 (pode ser ajustada por bairro futuramente)</span>
            </div>
            <button style={{ padding: '6px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
              Editar
            </button>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-title">Pedido Mínimo</span>
              <span className="setting-desc">R$ 30,00</span>
            </div>
            <button style={{ padding: '6px 12px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: 'var(--radius-sm)' }}>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
