import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Plus, Edit2, Trash2, Shield, X, Loader2 } from 'lucide-react';
import './MasterRoles.css';

interface Permission {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export default function MasterRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/master/roles'),
        api.get('/master/roles/permissions')
      ]);
      setRoles(rolesRes.data.data);
      setAvailablePermissions(permsRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar dados', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (role?: Role) => {
    setError(null);
    if (role) {
      setEditingRoleId(role.id);
      setRoleName(role.name);
      setSelectedPermissions(role.permissions);
    } else {
      setEditingRoleId(null);
      setRoleName('');
      setSelectedPermissions([]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoleId(null);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: roleName,
        permissions: selectedPermissions
      };

      if (editingRoleId) {
        await api.put(`/master/roles/${editingRoleId}`, payload);
      } else {
        await api.post('/master/roles', payload);
      }
      
      await fetchData();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0] || 'Ocorreu um erro ao salvar o cargo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.name === 'Master') {
      alert('Não é possível excluir o cargo nativo Master.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o cargo ${role.name}?`)) {
      try {
        await api.delete(`/master/roles/${role.id}`);
        await fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erro ao excluir cargo.');
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
          <h1 className="page-title">Cargos e Permissões</h1>
          <p className="page-subtitle">Gerencie os níveis de acesso da sua equipe SaaS</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} />
          Novo Cargo
        </button>
      </header>

      <div className="card-container mt-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome do Cargo</th>
              <th>Permissões Concedidas</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td className="font-medium text-white">{role.name}</td>
                <td>
                  <div className="flex gap-2 flex-wrap">
                    {role.permissions.map(p => (
                      <span key={p} className="badge-permission">
                        <Shield size={12} />
                        {availablePermissions.find(ap => ap.id === p)?.name || p}
                      </span>
                    ))}
                    {role.permissions.length === 0 && (
                      <span className="text-gray-500 text-sm italic">Nenhuma permissão</span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => openModal(role)}
                      className="btn-icon"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    {role.name !== 'Master' && (
                      <button 
                        onClick={() => handleDelete(role)}
                        className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-900/30"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-gray-500 py-8">
                  Nenhum cargo cadastrado.
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
              <h2>{editingRoleId ? 'Editar Cargo' : 'Novo Cargo'}</h2>
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
                <label>Nome do Cargo</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Suporte Nível 1"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={roleName === 'Master'}
                  required
                />
              </div>

              <div className="form-group">
                <label>Permissões do Sistema</label>
                <p className="text-sm text-gray-400 mb-3">Selecione o que usuários com este cargo poderão acessar e fazer no painel Master.</p>
                
                <div className="permissions-grid">
                  {availablePermissions.map(perm => (
                    <label key={perm.id} className="permission-item">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        disabled={roleName === 'Master'} // Master sempre tem tudo
                      />
                      <span>{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              </div>

              <div className="modal-footer" style={{ background: 'transparent', boxShadow: 'none' }}>
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
