import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, ShieldAlert, Settings, LogOut, Users, Menu, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import './MasterLayout.css';

export default function MasterLayout() {
  const { logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  // Só tem efeito visual no celular (ver MasterLayout.css) — no desktop o menu lateral já fica
  // sempre visível.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="master-container">
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <aside className={`master-sidebar glass-panel ${isSidebarOpen ? 'open' : ''}`}>
        <div className="master-sidebar-header">
          <div className="master-logo">
            <ShieldAlert size={28} className="master-icon-pulse" />
            <div>
              <h2>EasyPizza</h2>
              <span className="master-badge">MASTER</span>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={closeSidebar} title="Fechar menu">
            <X size={22} />
          </button>
        </div>

        <nav className="master-nav">
          <NavLink to="/" end onClick={closeSidebar} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ShieldAlert size={20} />
            <span>Dashboard</span>
          </NavLink>
          {hasPermission('Tenants:View') && (
            <NavLink to="/master/tenants" onClick={closeSidebar} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Building2 size={20} />
              <span>Lojistas (Tenants)</span>
            </NavLink>
          )}
          {hasPermission('MasterTeam:View') && (
            <NavLink to="/master/users" onClick={closeSidebar} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={20} />
              <span>Equipe Master</span>
            </NavLink>
          )}
          {hasPermission('MasterRoles:View') && (
            <NavLink to="/master/roles" onClick={closeSidebar} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Settings size={20} />
              <span>Cargos e Permissões</span>
            </NavLink>
          )}
        </nav>

        <div className="master-sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sair do SaaS</span>
          </button>
        </div>
      </aside>

      <main className="master-content">
        <header className="master-topbar">
          <div className="topbar-info">
            <button className="sidebar-open-btn" onClick={() => setIsSidebarOpen(true)} title="Abrir menu">
              <Menu size={22} />
            </button>
          </div>
          <div className="topbar-actions">
            <div className="status-pill online">
              <span className="status-dot"></span>
              <span className="status-pill-text">Banco Mestre Conectado</span>
            </div>
          </div>
        </header>

        <div className="master-page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

