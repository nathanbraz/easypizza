import { Outlet, NavLink } from 'react-router-dom';
import { Building2, ShieldAlert, Settings, LogOut } from 'lucide-react';
import './SuperAdminLayout.css';

export default function SuperAdminLayout() {
  return (
    <div className="superadmin-container">
      <aside className="superadmin-sidebar glass-panel">
        <div className="superadmin-sidebar-header">
          <div className="superadmin-logo">
            <ShieldAlert size={28} className="superadmin-icon-pulse" />
            <div>
              <h2>EasyPizza</h2>
              <span className="superadmin-badge">SUPER ADMIN</span>
            </div>
          </div>
        </div>
        
        <nav className="superadmin-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ShieldAlert size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/tenants" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Building2 size={20} />
            <span>Empresas (Tenants)</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Configurações Globais</span>
          </NavLink>
        </nav>

        <div className="superadmin-sidebar-footer">
          <button className="logout-btn">
            <LogOut size={20} />
            <span>Sair do SaaS</span>
          </button>
        </div>
      </aside>

      <main className="superadmin-content">
        <header className="superadmin-topbar">
          <div className="topbar-info">
          </div>
          <div className="topbar-actions">
            <div className="status-pill online">
              <span className="status-dot"></span>
              Banco Mestre Conectado
            </div>
          </div>
        </header>

        <div className="superadmin-page-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
