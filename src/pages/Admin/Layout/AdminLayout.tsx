import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Pizza, Bike, Settings, LogOut, Megaphone, Shield, Users } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import './AdminLayout.css';

export default function AdminLayout() {
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);
  const { logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    // Busca avisos globais do SaaS
    api.get('/master/dashboard/settings')
      .then(res => {
        if (res.data?.data?.isAnnouncementActive && res.data.data.globalAnnouncementMessage) {
          setGlobalMsg(res.data.data.globalAnnouncementMessage);
        }
      })
      .catch(err => console.error("Erro ao buscar avisos globais:", err));
  }, []);

  return (
    <div className="admin-container">
      <aside className="admin-sidebar glass-panel">
        <div className="sidebar-header">
          <h2>EasyPizza Admin</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutDashboard size={20} />
            <span>Pedidos</span>
          </NavLink>
          <NavLink to="/admin/catalog" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Pizza size={20} />
            <span>Cardápio</span>
          </NavLink>
          <NavLink to="/admin/couriers" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Bike size={20} />
            <span>Entregadores</span>
          </NavLink>
          {hasPermission('Roles:View') && (
            <NavLink to="/admin/roles" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Shield size={20} />
              <span>Cargos</span>
            </NavLink>
          )}
          {hasPermission('Team:View') && (
            <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={20} />
              <span>Equipe</span>
            </NavLink>
          )}
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Configurações</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="admin-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {globalMsg && (
          <div className="global-announcement" style={{ backgroundColor: '#ffca28', color: '#333', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', borderRadius: '8px', marginBottom: '1.5rem', boxShadow: '0 4px 12px rgba(255, 202, 40, 0.2)' }}>
            <Megaphone size={18} />
            <span>{globalMsg}</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
