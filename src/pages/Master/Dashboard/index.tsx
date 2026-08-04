import { useState, useEffect } from 'react';
import { Building2, Activity, Ban, Server } from 'lucide-react';
import { api } from '../../../lib/api';
import './Dashboard.css';

interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  systemStatus: string;
}

export default function MasterDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master/dashboard');
      setMetrics(res.data);
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="dashboard-loading" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="global-spinner"></div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando métricas do sistema...</p>
      </div>
    );
  }

  return (
    <div className="master-dashboard">
      <div className="dashboard-header">
        <h2>Visão Geral do Sistema</h2>
        <p>Métricas globais de todas as empresas clientes e saúde do SaaS.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-icon primary">
            <Building2 size={24} />
          </div>
          <div className="metric-info">
            <h3>Total de Empresas</h3>
            <span className="metric-value">{metrics.totalTenants}</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon success">
            <Activity size={24} />
          </div>
          <div className="metric-info">
            <h3>Empresas Ativas</h3>
            <span className="metric-value">{metrics.activeTenants}</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon danger">
            <Ban size={24} />
          </div>
          <div className="metric-info">
            <h3>Inadimplentes / Bloqueadas</h3>
            <span className="metric-value">{metrics.suspendedTenants}</span>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-icon info">
            <Server size={24} />
          </div>
          <div className="metric-info">
            <h3>Status da API (Master)</h3>
            <span className="metric-value">{metrics.systemStatus}</span>
          </div>
        </div>
      </div>
      
      {/* Aqui no futuro entra o Chart de Receita ou Pedidos */}
      <div className="dashboard-widgets">
        <div className="widget glass-panel">
          <h3>Estatísticas de Tráfego</h3>
          <div className="widget-placeholder">
            <p>Gráficos de pedidos globais serão exibidos aqui em versões futuras.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
