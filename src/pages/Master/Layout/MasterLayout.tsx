import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, ShieldAlert, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import './MasterLayout.css';

export default function MasterLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="master-container">
      <aside className="master-sidebar glass-panel">
        <div className="master-sidebar-header">
          <div className="master-logo">
            <ShieldAlert size={28} className="master-icon-pulse" />
            <div>
              <h2>EasyPizza</h2>
              <span className="master-badge">MASTER</span>
            </div>
          </div>
        </div>
        
        <nav className="master-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ShieldAlert size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/master/tenants" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Building2 size={20} />
            <span>Lojistas (Tenants)</span>
          </NavLink>
          <NavLink to="/master/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <ShieldAlert size={20} />
            <span>Equipe Master</span>
          </NavLink>
          <NavLink to="/master/roles" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Cargos e Permissões</span>
          </NavLink>
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
          </div>
          <div className="topbar-actions">
            <div className="status-pill online">
              <span className="status-dot"></span>
              Banco Mestre Conectado
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
