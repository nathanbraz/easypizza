import { useState, useEffect } from 'react';
import { Building2, Plus, Database, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle, Ban, PlayCircle } from 'lucide-react';
import { api } from '../../../lib/api';
import './Tenants.css';

interface Tenant {
  id?: string | number;
  name: string;
  slug: string;
  connectionString: string;
  isActive?: boolean;
  createdAt?: string;
  whatsAppNumber?: string;
  themeColor?: string;
}

export default function TenantsDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [migratingSlug, setMigratingSlug] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Estado do Formulário
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [connectionString, setConnectionString] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/tenants');
      const data = res.data.data || res.data || [];
      if (Array.isArray(data)) {
        setTenants(data);
      }
    } catch (error) {
      console.error("Erro ao carregar tenants do Banco Mestre:", error);
      setFeedbackMsg({ text: "Não foi possível conectar ao Banco Mestre.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    // Sugerir slug automaticamente a partir do nome
    const autoSlug = val.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^a-z0-9]/g, ""); // remove espaços e caracteres especiais
    setSlug(autoSlug);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      setFeedbackMsg({ text: "Nome e Slug são obrigatórios.", type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedbackMsg(null);

    try {
      await api.post('/master/tenants', {
        name,
        slug,
        connectionString: connectionString || undefined
      });

      setFeedbackMsg({ text: `Empresa "${name}" cadastrada e banco de dados isolado gerado com sucesso!`, type: 'success' });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setConnectionString('');
      fetchTenants();
    } catch (error: any) {
      console.error("Erro ao criar tenant:", error);
      const errMsg = error.response?.data?.message || error.response?.data || "Erro ao criar empresa no back-end.";
      setFeedbackMsg({ text: typeof errMsg === 'string' ? errMsg : "Falha no cadastro do tenant.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMigrateTenant = async (tenantSlug: string, tenantName: string) => {
    setMigratingSlug(tenantSlug);
    setFeedbackMsg(null);
    try {
      const res = await api.post(`/master/tenants/${tenantSlug}/migrate`);
      setFeedbackMsg({ text: res.data.message || `Banco da ${tenantName} atualizado!`, type: 'success' });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || "Erro na migração do banco.";
      setFeedbackMsg({ text: errMsg, type: 'error' });
    } finally {
      setMigratingSlug(null);
    }
  };

  const handleSyncAllTenants = async () => {
    if (!window.confirm("Atenção: Isso vai rodar as Migrations em TODOS os bancos de dados de todos os clientes. Pode levar alguns minutos. Deseja continuar?")) return;
    
    setFeedbackMsg(null);
    try {
      const res = await api.post('/master/tenants/sync-all');
      setFeedbackMsg({ text: res.data.message || "Sincronização em massa concluída!", type: 'success' });
    } catch (error: any) {
      setFeedbackMsg({ text: "Erro ao tentar sincronizar os bancos de dados.", type: 'error' });
    }
  };

  const handleToggleStatus = async (tenantSlug: string, currentStatus: boolean | undefined) => {
    const action = currentStatus ? "SUSPENDER" : "ATIVAR";
    if (!window.confirm(`Tem certeza que deseja ${action} esta empresa? ${currentStatus ? "O cardápio e o painel admin dela sairão do ar imediatamente." : "O acesso será restaurado."}`)) return;

    try {
      await api.put(`/master/tenants/${tenantSlug}/toggle-status`);
      setFeedbackMsg({ text: `Empresa ${action === "SUSPENDER" ? "suspensa" : "ativada"} com sucesso.`, type: 'success' });
      fetchTenants(); // Recarrega para ver o novo status
    } catch (error: any) {
      setFeedbackMsg({ text: error.response?.data?.message || "Erro ao alterar status da empresa.", type: 'error' });
    }
  };

  const getTenantUrl = (tenantSlug: string, path: string = '') => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Se for ambiente local lvh.me ou localhost
    if (hostname.includes('lvh.me') || hostname === 'localhost') {
      return `http://${tenantSlug}.lvh.me${port}${path}`;
    }
    
    // Produção cloudflare/vercel
    if (hostname.includes('.')) {
      const baseDomain = hostname.substring(hostname.indexOf('.') + 1);
      return `${window.location.protocol}//${tenantSlug}.${baseDomain}${path}`;
    }
    
    // Fallback padrão
    return `http://${tenantSlug}.lvh.me${port}${path}`;
  };

  return (
    <div className="tenants-dashboard">
      <div className="dashboard-actions-header">
        <div>
          <h2>Empresas Clientes (Tenants)</h2>
          <p>Cada empresa opera com isolamento de dados no back-end.</p>
        </div>
        
        <div className="header-buttons">
          <button className="btn-secondary" onClick={handleSyncAllTenants}>
            <Database size={18} />
            <span>Sincronizar Todos os Bancos</span>
          </button>
          
          <button className="btn-secondary" onClick={fetchTenants} disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>Atualizar Lista</span>
          </button>
          
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Cadastrar Empresa</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`feedback-alert ${feedbackMsg.type}`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>{feedbackMsg.text}</span>
          <button className="close-feedback" onClick={() => setFeedbackMsg(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <RefreshCw size={36} className="spin text-accent" />
          <p>Conectando ao Banco Mestre (`easypizza_master`)...</p>
        </div>
      ) : tenants.length === 0 ? (
        <div className="empty-state glass-panel">
          <Building2 size={56} className="text-muted" />
          <h3>Nenhuma empresa cliente cadastrada (Dia 0)</h3>
          <p>O seu SaaS ainda não possui clientes contratantes. Clique no botão abaixo para simular o onboarding da sua primeira empresa!</p>
          <button className="btn-primary mt-4" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Cadastrar 1º Cliente (Ex: Pizza Top)</span>
          </button>
        </div>
      ) : (
        <div className="tenants-grid">
          {tenants.map((tenant) => (
            <div key={tenant.id} className={`tenant-card glass-panel ${!tenant.isActive ? 'suspended' : ''}`}>
              <div className="tenant-card-header">
                <div className="tenant-info">
                  <div className="tenant-avatar" style={{ backgroundColor: tenant.themeColor || '#ff7e5f' }}>
                    {tenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3>{tenant.name}</h3>
                    <span className="tenant-slug">{tenant.slug}</span>
                  </div>
                </div>
                <div className={`status-badge ${tenant.isActive ? 'active' : 'inactive'}`}>
                  {tenant.isActive ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                  <span>{tenant.isActive ? 'Ativo' : 'Suspenso'}</span>
                </div>
              </div>

              <div className="tenant-card-body">
                <div className="db-info">
                  <Database size={16} className="text-accent" />
                  <div className="db-string-preview" title={tenant.connectionString}>
                    <span className="label">Banco de Dados Isolado:</span>
                    <code>{tenant.connectionString ? tenant.connectionString.replace(/Password=[^;]+;?/i, 'Password=***;') : 'Automático'}</code>
                  </div>
                </div>
              </div>

              <div className="tenant-card-footer">
                <div className="tenant-actions mt-4">
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => handleMigrateTenant(tenant.slug, tenant.name)}
                    disabled={migratingSlug === tenant.slug}
                  >
                    <RefreshCw size={14} className={migratingSlug === tenant.slug ? "spin" : ""} />
                    <span>Sync DB</span>
                  </button>
                  
                  <a href={getTenantUrl(tenant.slug)} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm" title="Abrir Cardápio Público">
                    <ExternalLink size={14} />
                    <span>Cardápio</span>
                  </a>
                  
                  <a href={getTenantUrl(tenant.slug, '/admin')} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm" title="Entrar como Lojista (Suporte)">
                    <PlayCircle size={14} />
                    <span>Acessar Painel</span>
                  </a>

                  <button 
                    className={`btn-secondary btn-sm ${tenant.isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
                    onClick={() => handleToggleStatus(tenant.slug, tenant.isActive)}
                    style={{ marginLeft: 'auto', borderColor: tenant.isActive ? '#ff4d4d' : '#4caf50', color: tenant.isActive ? '#ff4d4d' : '#4caf50' }}
                  >
                    {tenant.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    <span>{tenant.isActive ? 'Suspender' : 'Ativar'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar Empresa */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Cadastrar Nova Empresa Cliente</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateTenant}>
              <div className="form-group">
                <label>Nome da Empresa *</label>
                <input 
                  type="text" 
                  placeholder="ex: Minha Empresa" 
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Subdomínio / Slug (Identificador na URL) *</label>
                <div className="slug-input-wrapper">
                  <input 
                    type="text" 
                    placeholder="ex: pizzatop" 
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    required 
                  />
                  <span className="slug-preview">.easypizza.com.br (ou .lvh.me)</span>
                </div>
                <small className="form-hint">Este será o endereço único onde o cliente acessará o cardápio e o admin.</small>
              </div>

              <div className="form-group">
                <label>ConnectionString do Banco de Dados (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Deixe em branco para geração automática em localhost" 
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                />
                <small className="form-hint">Se vazio, o .NET Core criará automaticamente <code>easypizza_{slug || 'nome'}</code>.</small>
              </div>

              <div className="modal-notice">
                <Database size={18} className="text-accent" />
                <p>Ao clicar em cadastrar, a API iniciará o <strong>Entity Framework Migrate</strong> para criar o banco de dados físico desta empresa instantaneamente!</p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Gerando Banco e Cliente...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Concluir Cadastro</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
