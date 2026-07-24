import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage';
import OrderTrackerPage from './pages/OrderTrackerPage';

import AdminLayout from './pages/Admin/Layout/AdminLayout';
import OrdersDashboard from './pages/Admin/Orders';
import CatalogManager from './pages/Admin/Catalog';
import CouriersManager from './pages/Admin/Couriers';
import SettingsManager from './pages/Admin/Settings';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tenant Route */}
        <Route path="/:tenantSlug" element={<MenuPage />} />
        
        <Route path="/tracker" element={<OrderTrackerPage />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="orders" element={<OrdersDashboard />} />
          <Route path="catalog" element={<CatalogManager />} />
          <Route path="couriers" element={<CouriersManager />} />
          <Route path="settings" element={<SettingsManager />} />
        </Route>
        
        {/* Redirect root to a default tenant or show a landing page (for dev: redirect to pizzariabrazil) */}
        <Route path="/" element={<Navigate to="/pizzariabrazil" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
