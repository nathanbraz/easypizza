import React, { useState, useEffect } from 'react';
import { api, getTenantSlugFromUrl } from '../../../lib/api';
import { Plus, Trash2, Shield, X, Loader2, User as UserIcon, AtSign, Lock, Eye, EyeOff, Edit2, Ban, CheckCircle } from 'lucide-react';
import './TenantUsers.css';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  userName: string;
  role: string | null;
  isActive: boolean;
}

import { useAuth } from '../../../contexts/AuthContext';

export default function TenantUsers() {
  const { hasPermission } = useAuth();
  const tenantSlug = getTenantSlugFromUrl();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get(`/users/${tenantSlug}`),
        api.get(`/roles/${tenantSlug}`)
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (user?: User) => {
    setError(null);
    if (user) {
      setEditingUserId(user.id);
      setName(user.name);
      setUserName(user.userName);
      setPassword('');
      setRoleName(user.role || '');
    } else {
      setEditingUserId(null);
      setName('');
      setUserName('');
      setPassword('');
      setRoleName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingUserId) {
        await api.put(`/users/${tenantSlug}/${editingUserId}`, {
          name,
          roleName
        });
      } else {
        await api.post(`/users/${tenantSlug}`, {
          name,
          userName: userName.toLowerCase(),
          password,
          roleName
        });
      }
      
      await fetchData();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Ocorreu um erro ao salvar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.isActive ? 'bloquear' : 'desbloquear';
    if (window.confirm(`Tem certeza que deseja ${action} o usuário ${user.name}?`)) {
      try {
        await api.patch(`/users/${tenantSlug}/${user.id}/toggle-status`);
        await fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || `Erro ao ${action} usuário.`);
      }
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      try {
        await api.delete(`/users/${tenantSlug}/${user.id}`);
        await fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erro ao excluir usuário.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader2 className="animate-spin text-brand" size={40} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1 className="page-title">Equipe da Loja</h1>
          <p className="page-subtitle">Gerencie os funcionários e acessos</p>
        </div>
        {hasPermission('Team:Create') && (
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus size={20} />
            Novo Usuário
          </button>
        )}
      </header>

      <div className="card-container mt-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Login</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '0.5rem' }}>Ações</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="user-avatar">
                      <UserIcon size={16} />
                    </div>
                    <span style={{ fontWeight: 500, color: 'white' }}>{user.name}</span>
                  </div>
                </td>
                <td className="text-gray-400">{user.userName}</td>
                <td>
                  <span className="badge-role">
                    <Shield size={12} />
                    {user.role || 'Sem Cargo'}
                  </span>
                </td>
                <td>
                  <span className="badge-role" style={{ backgroundColor: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.2)', color: user.isActive ? '#4ade80' : '#94a3b8', border: 'none' }}>
                    {user.isActive ? 'Ativo' : 'Bloqueado'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="actions-container">
                    {hasPermission('Team:Edit') && (
                      <button 
                        onClick={() => openModal(user)}
                        className="btn-icon icon-edit"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {hasPermission('Team:Block') && (
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className={`btn-icon ${user.isActive ? 'icon-block' : 'icon-unblock'}`}
                        title={user.isActive ? "Bloquear" : "Desbloquear"}
                      >
                        {user.isActive ? <Ban size={18} /> : <CheckCircle size={18} />}
                      </button>
                    )}
                    {hasPermission('Team:Delete') && (
                      <button 
                        onClick={() => handleDelete(user)}
                        className="btn-icon icon-delete"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-8">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content w-full max-w-md" style={{ height: 'fit-content' }}>
            <header className="modal-header">
              <h2>{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button type="button" className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body">
                {error && (
                  <div className="error-message mb-4">
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label>Nome Completo</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: Carlos Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Nome de Usuário (login)</label>
                  <div style={{ position: 'relative' }}>
                    <AtSign className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ex: joao.silva"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value.toLowerCase())}
                      required
                      disabled={!!editingUserId}
                      style={{ paddingLeft: '2.5rem', opacity: editingUserId ? 0.6 : 1, cursor: editingUserId ? 'not-allowed' : 'text' }}
                    />
                  </div>
                </div>

                {!editingUserId && (
                  <div className="form-group">
                    <label>Senha Inicial</label>
                    <div style={{ position: 'relative' }}>
                      <Lock className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '14px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#a0aabf',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Cargo (Role)</label>
                  <div style={{ position: 'relative' }}>
                    <Shield className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
                    <select 
                      className="form-input"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                      style={{ paddingLeft: '2.5rem', appearance: 'none' }}
                    >
                      <option value="" disabled>Selecione um cargo</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="modal-footer" style={{ background: 'transparent', boxShadow: 'none' }}>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingUserId ? 'Salvar Alterações' : 'Criar Usuário')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
