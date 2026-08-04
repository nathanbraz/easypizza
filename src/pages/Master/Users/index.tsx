import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Plus, Trash2, Shield, X, Loader2, User as UserIcon, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import './MasterUsers.css';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export default function MasterUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        api.get('/master/users'),
        api.get('/master/roles')
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => {
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setRoleName('');
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
      await api.post('/master/users', {
        name,
        email,
        password,
        roleName
      });
      
      await fetchData();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Ocorreu um erro ao criar usuário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      try {
        await api.delete(`/master/users/${user.id}`);
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
          <h1 className="page-title">Equipe Master</h1>
          <p className="page-subtitle">Gerencie os usuários administrativos do SaaS</p>
        </div>
        <button className="btn-primary" onClick={openModal}>
          <Plus size={20} />
          Novo Usuário
        </button>
      </header>

      <div className="card-container mt-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand">
                      <UserIcon size={16} />
                    </div>
                    <span className="font-medium text-white">{user.name}</span>
                  </div>
                </td>
                <td className="text-gray-400">{user.email}</td>
                <td>
                  <span className="badge-role">
                    <Shield size={12} />
                    {user.role || 'Sem Cargo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => handleDelete(user)}
                      className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
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
              <h2>Novo Usuário</h2>
              <button className="btn-icon" onClick={closeModal}>
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
                <label>E-mail Corporativo</label>
                <div style={{ position: 'relative' }}>
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="carlos@easypizza.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

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
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
