import { useState, useEffect } from 'react';
import { Building2, Plus, Database, ExternalLink, RefreshCw, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
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
}

export default function TenantsDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [migratingSlug, setMigratingSlug] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [connectionString, setConnectionString] = useState('');

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/superadmin/tenants');
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
    // Auto-suggest slug from name
    const autoSlug = val.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, ""); // remove spaces and special chars
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
      await api.post('/superadmin/tenants', {
        name,
        slug,
        connectionString: connectionString || undefined
      });

      setFeedbackMsg({ text: `Pizzaria "${name}" cadastrada e banco de dados isolado gerado com sucesso!`, type: 'success' });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setConnectionString('');
      fetchTenants();
    } catch (error: any) {
      console.error("Erro ao criar tenant:", error);
      const errMsg = error.response?.data?.message || error.response?.data || "Erro ao criar pizzaria no back-end.";
      setFeedbackMsg({ text: typeof errMsg === 'string' ? errMsg : "Falha no cadastro do tenant.", type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMigrateTenant = async (tenantSlug: string, tenantName: string) => {
    setMigratingSlug(tenantSlug);
    setFeedbackMsg(null);
    try {
      const res = await api.post(`/superadmin/tenants/${tenantSlug}/migrate`);
      setFeedbackMsg({ text: res.data.message || `Banco da ${tenantName} atualizado!`, type: 'success' });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || "Erro na migração do banco.";
      setFeedbackMsg({ text: errMsg, type: 'error' });
    } finally {
      setMigratingSlug(null);
    }
  };

  const getTenantUrl = (tenantSlug: string, path: string = '') => {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // If local lvh.me or localhost
    if (hostname.includes('lvh.me') || hostname === 'localhost') {
      return `http://${tenantSlug}.lvh.me${port}${path}`;
    }
    
    // Production cloudflare/vercel
    if (hostname.includes('.')) {
      const baseDomain = hostname.substring(hostname.indexOf('.') + 1);
      return `${window.location.protocol}//${tenantSlug}.${baseDomain}${path}`;
    }
    
    // Fallback
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
          <button className="btn-secondary" onClick={fetchTenants} disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            <span>Atualizar Lista</span>
          </button>
          
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Cadastrar Nova Pizzaria</span>
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
          <h3>Nenhuma pizzaria cliente cadastrada (Dia 0)</h3>
          <p>O seu SaaS ainda não possui clientes contratantes. Clique no botão abaixo para simular o onboarding da sua primeira pizzaria!</p>
          <button className="btn-primary mt-4" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            <span>Cadastrar 1º Cliente (Ex: Pizza Top)</span>
          </button>
        </div>
      ) : (
        <div className="tenants-grid">
          {tenants.map((t, idx) => (
            <div key={t.slug || idx} className="tenant-card glass-panel">
              <div className="tenant-card-header">
                <div className="tenant-title">
                  <div className="tenant-avatar">{t.name.substring(0, 2).toUpperCase()}</div>
                  <div>
                    <h3>{t.name}</h3>
                    <span className="tenant-slug-badge">{t.slug}</span>
                  </div>
                </div>
                <div className="tenant-status">
                  <span className="badge-active">
                    <ShieldCheck size={14} /> Ativo
                  </span>
                </div>
              </div>

              <div className="tenant-card-body">
                <div className="db-info">
                  <Database size={16} className="text-accent" />
                  <div className="db-string-preview" title={t.connectionString}>
                    <span className="label">Banco de Dados Isolado:</span>
                    <code>{t.connectionString ? t.connectionString.replace(/Password=[^;]+;?/i, 'Password=***;') : 'Automático'}</code>
                  </div>
                </div>
              </div>

              <div className="tenant-card-footer">
                <button 
                  className="btn-migrate" 
                  onClick={() => handleMigrateTenant(t.slug, t.name)}
                  disabled={migratingSlug === t.slug}
                  title="Executar EF Core Migrate dinamicamente neste banco"
                >
                  <RefreshCw size={14} className={migratingSlug === t.slug ? "spin" : ""} />
                  <span>{migratingSlug === t.slug ? "Migrando..." : "Sync DB"}</span>
                </button>

                <div className="tenant-links">
                  <a 
                    href={getTenantUrl(t.slug, '')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-btn client-link"
                    title="Abrir cardápio do cliente"
                  >
                    <span>Cardápio</span>
                    <ExternalLink size={14} />
                  </a>
                  
                  <a 
                    href={getTenantUrl(t.slug, '/admin')} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link-btn admin-link"
                    title="Abrir painel administrativo da empresa"
                  >
                    <span>Painel Admin</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar Pizzaria */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Cadastrar Nova Pizzaria Cliente</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateTenant}>
              <div className="form-group">
                <label>Nome da Pizzaria *</label>
                <input 
                  type="text" 
                  placeholder="ex: Pizza Top" 
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
