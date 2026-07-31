import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import { isSuperAdmin, api } from './lib/api';

import './index.css';

function App() {
  const superAdmin = isSuperAdmin();
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [tenantSuspended, setTenantSuspended] = useState(false);
  const [isValidating, setIsValidating] = useState(!superAdmin);

  const hostname = window.location.hostname;
  const isSubdomain = hostname.includes('.') && 
                      !hostname.startsWith('www.') && 
                      !hostname.startsWith('localhost') && 
                      !hostname.startsWith('api.') && 
                      !hostname.startsWith('admin.') && 
                      !hostname.startsWith('superadmin.');

  // Componente auxiliar para redirecionar mantendo a querystring (ex: ?t=token)
  const RedirectWithQuery = () => {
    const location = useLocation();
    return <Navigate to={{ pathname: "/", search: location.search }} replace />;
  };

  useEffect(() => {
    const handleNotFound = () => setTenantNotFound(true);
    const handleSuspended = () => setTenantSuspended(true);
    
    window.addEventListener('tenant-not-found', handleNotFound);
    window.addEventListener('tenant-suspended', handleSuspended);
    
    // Dispara uma requisição leve apenas para validar o tenant antes de renderizar a UI
    if (!superAdmin) {
      api.get('/menu') // endpoint público e real (MenuController)
        .then(() => setIsValidating(false))
        .catch(() => {
          // O catch é tratado pelo interceptor (api.ts) que vai disparar os eventos
          // Mas liberamos o validating para a tela de erro poder ser exibida
          setIsValidating(false);
        });
    }

    return () => {
      window.removeEventListener('tenant-not-found', handleNotFound);
      window.removeEventListener('tenant-suspended', handleSuspended);
    };
  }, [superAdmin]);

  if (superAdmin) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<TenantsDashboard />} />
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

  if (tenantSuspended) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f1115', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#f5a623', marginBottom: '1rem', fontSize: '2.5rem' }}>Loja Temporariamente Indisponível</h1>
        <p style={{ color: '#a0aabf', fontSize: '1.1rem', maxWidth: '600px' }}>
          Este estabelecimento encontra-se temporariamente suspenso devido a pendências financeiras ou administrativas com a plataforma.
        </p>
        <p style={{ color: '#a0aabf', marginTop: '1rem', fontWeight: 'bold' }}>
          Se você é o proprietário, acesse o painel SuperAdmin ou entre em contato com o suporte para regularizar a situação.
        </p>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0f1115' }}>
        <div className="global-spinner" />
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
        {!isSubdomain && (
          <>
            <Route path="/:tenantSlug" element={<MenuPage />} />
            <Route path="/:tenantSlug/pedido" element={<MenuPage />} />
          </>
        )}
        
        <Route path="/tracker" element={<OrderTrackerPage />} />
        <Route path="/tracker/:orderId" element={<OrderTrackerPage />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<OrdersDashboard />} />
          <Route path="catalog" element={<CatalogManager />} />
          <Route path="couriers" element={<CouriersManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>
        
        <Route path="*" element={<RedirectWithQuery />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
