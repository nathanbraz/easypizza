import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Shield, Plus, Trash2, Edit2, X, Loader2 } from 'lucide-react';
import './MasterRoles.css';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

import { useAuth } from '../../../contexts/AuthContext';

export default function MasterRoles() {
  const { hasPermission } = useAuth();
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
      setSelectedPermissions(role.permissions || []);
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
    setSelectedPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (editingRoleId) {
        await api.put(`/master/roles/${editingRoleId}`, {
          name: roleName,
          permissions: selectedPermissions
        });
      } else {
        await api.post('/master/roles', {
          name: roleName,
          permissions: selectedPermissions
        });
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
      alert('O cargo Master não pode ser excluído.');
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
          <p className="page-subtitle">Configure os níveis de acesso para a equipe Master</p>
        </div>
        {hasPermission('MasterRoles:Create') && (
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus size={20} />
            Novo Cargo
          </button>
        )}
      </header>

      <div className="card-container mt-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome do Cargo</th>
              <th>Permissões</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-brand">
                      <Shield size={16} />
                    </div>
                    <span className="font-medium text-white">{role.name}</span>
                  </div>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions?.length > 0 ? (
                      role.permissions.map(perm => (
                        <span key={perm} className="badge-permission">
                          {perm}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Sem permissões</span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-3">
                    {hasPermission('MasterRoles:Edit') && (
                      <button 
                        onClick={() => openModal(role)}
                        className="btn-icon text-brand hover:text-brand hover:bg-brand/10"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {hasPermission('MasterRoles:Delete') && (
                      <button 
                        onClick={() => handleDelete(role)}
                        className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-900/30"
                        title="Excluir"
                        disabled={role.name === 'Master'}
                        style={{ opacity: role.name === 'Master' ? 0.3 : 1, cursor: role.name === 'Master' ? 'not-allowed' : 'pointer' }}
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
          <div className="modal-content" style={{ height: 'fit-content', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <header className="modal-header">
              <h2>{editingRoleId ? 'Editar Cargo' : 'Novo Cargo'}</h2>
              <button type="button" className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="modal-body" style={{ paddingTop: '0.75rem' }}>
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

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label>Permissões do Sistema</label>
                  
                  <div className="permissions-groups">
                    {Object.entries(
                      availablePermissions.reduce((acc, perm) => {
                        const [group] = perm.id.split(':');
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(perm);
                        return acc;
                      }, {} as Record<string, Permission[]>)
                    ).map(([groupKey, perms]) => {
                      const groupNames: Record<string, string> = {
                        Tenants: 'Lojistas (Empresas Clientes)',
                        MasterTeam: 'Usuários da Equipe',
                        MasterRoles: 'Cargos e Permissões',
                        Billing: 'Faturamento e Assinaturas'
                      };
                      return (
                        <div key={groupKey} className="permission-group">
                          <h4 className="permission-group-title">{groupNames[groupKey] || groupKey}</h4>
                          <div className="permissions-grid">
                            {perms.map(perm => (
                              <label key={perm.id} className="permission-item">
                                <div className="permission-switch">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(perm.id)}
                                    onChange={() => togglePermission(perm.id)}
                                    disabled={roleName === 'Master'}
                                  />
                                  <span className="slider"></span>
                                </div>
                                <span className="permission-name">{perm.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
