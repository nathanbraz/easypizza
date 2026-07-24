import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import '../Catalog/Catalog.css';

export default function CouriersManager() {
  return (
    <div className="catalog-manager animate-fade-in">
      <header className="catalog-header">
        <h1>Entregadores (Motoboys)</h1>
        <button className="btn-primary">
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
              <tr>
                <td>Carlos Almeida</td>
                <td>(11) 98888-7777</td>
                <td>ABC-1234</td>
                <td><span className="status-badge" style={{ padding: '4px 8px' }}>Disponível</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-icon"><Edit2 size={16} /></button>
                    <button className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Felipe Santos</td>
                <td>(11) 97777-6666</td>
                <td>XYZ-9876</td>
                <td><span className="status-badge" style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Em Entrega</span></td>
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
      </main>
    </div>
  );
}
