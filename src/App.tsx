import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MenuPage from './pages/MenuPage';
import OrderTrackerPage from './pages/OrderTrackerPage';

import AdminLayout from './pages/Admin/Layout/AdminLayout';
import OrdersDashboard from './pages/Admin/Orders';
import CatalogManager from './pages/Admin/Catalog';
import CouriersManager from './pages/Admin/Couriers';
import SettingsManager from './pages/Admin/Settings';

import SuperAdminLayout from './pages/SuperAdmin/Layout/SuperAdminLayout';
import TenantsDashboard from './pages/SuperAdmin/Tenants';
import { isSuperAdmin } from './lib/api';

import './index.css';

function App() {
  const superAdmin = isSuperAdmin();
  const [tenantNotFound, setTenantNotFound] = useState(false);

  useEffect(() => {
    const handleNotFound = () => setTenantNotFound(true);
    window.addEventListener('tenant-not-found', handleNotFound);
    return () => window.removeEventListener('tenant-not-found', handleNotFound);
  }, []);

  if (superAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SuperAdminLayout />}>
            <Route index element={<TenantsDashboard />} />
            <Route path="settings" element={<div style={{ padding: '2rem', color: '#fff' }}><h2>Configurações Globais do SaaS (Em breve)</h2></div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  if (tenantNotFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f1115', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#ff4d4d', marginBottom: '1rem', fontSize: '2.5rem' }}>Loja Não Encontrada</h1>
        <p style={{ color: '#a0aabf', fontSize: '1.1rem' }}>O endereço que você acessou não corresponde a uma loja ativa em nosso sistema.</p>
        <p style={{ color: '#a0aabf', marginTop: '0.5rem' }}>Verifique se a URL/Subdomínio está correto ou entre em contato com o estabelecimento.</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz por Subdomínio (ex: pizzatop.lvh.me / pizzariabrazil.lvh.me) */}
        <Route path="/" element={<MenuPage />} />
        <Route path="/pedido" element={<MenuPage />} />
        
        {/* Rota de Fallback para localhost sem subdomínios (ex: localhost:3333/pizzariabrazil) */}
        <Route path="/:tenantSlug" element={<MenuPage />} />
        <Route path="/:tenantSlug/pedido" element={<MenuPage />} />
        
        <Route path="/tracker" element={<OrderTrackerPage />} />
        <Route path="/tracker/:orderId" element={<OrderTrackerPage />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<OrdersDashboard />} />
          <Route path="catalog" element={<CatalogManager />} />
          <Route path="couriers" element={<CouriersManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
