import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import './Catalog.css';

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState('produtos');

  return (
    <div className="catalog-manager animate-fade-in">
      <header className="catalog-header">
        <h1>Gestão de Cardápio</h1>
        <button className="btn-primary">
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
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="product-cell">
                      <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591" alt="Pizza" className="product-img-mini" />
                      <span>Pizza de Calabresa</span>
                    </div>
                  </td>
                  <td>Pizzas Tradicionais</td>
                  <td>R$ 45,90</td>
                  <td><span className="status-badge" style={{ padding: '4px 8px' }}>Ativo</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon"><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="product-cell">
                      <div className="product-img-mini"></div>
                      <span>Coca-Cola 2L</span>
                    </div>
                  </td>
                  <td>Bebidas</td>
                  <td>R$ 14,00</td>
                  <td><span className="status-badge" style={{ padding: '4px 8px' }}>Ativo</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon"><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
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
                  <th>Itens Vinculados</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Pizzas Tradicionais</td>
                  <td>12 produtos</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon"><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
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
                  <th>Regras</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Borda Recheada de Catupiry</td>
                  <td>+ R$ 10,00</td>
                  <td>Opcional (Máx 1)</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon"><Edit2 size={16} /></button>
                      <button className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
