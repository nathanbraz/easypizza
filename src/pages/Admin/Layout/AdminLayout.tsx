import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Pizza, Bike, Settings, LogOut } from 'lucide-react';
import './AdminLayout.css';

export default function AdminLayout() {
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
          <NavLink to="/admin/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Configurações</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
