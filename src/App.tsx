import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

  return (
    <BrowserRouter>
      <Routes>
        {/* Subdomain Root Route (e.g. pizzatop.lvh.me / pizzariabrazil.lvh.me) */}
        <Route path="/" element={<MenuPage />} />
        <Route path="/pedido" element={<MenuPage />} />
        
        {/* Legacy Path Fallback Route for localhost without subdomains (e.g. localhost:3333/pizzariabrazil) */}
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
