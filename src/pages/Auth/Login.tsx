import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getTenantSlugFromUrl, isMaster } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const masterMode = isMaster();
  const tenantSlug = getTenantSlugFromUrl();

  // Se já estiver logado, redireciona automaticamente para o painel correspondente
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.scope === 'Master') {
        if (masterMode) {
          navigate('/');
        } else {
          navigate('/admin/orders');
        }
      } else {
        navigate('/admin/orders');
      }
    }
  }, [isAuthenticated, user, navigate, masterMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const data = response.data;
      if (data.success && data.data) {
        const payload = data.data;
        const token = payload.token;
        
        // Salva no contexto e localStorage
        login(token, {
          id: payload.email, // backend não retorna id, usamos o email como fallback
          name: payload.name,
          email: payload.email,
          role: payload.role,
          scope: payload.scope,
          tenantSlug: payload.tenantSlug,
          permissions: [] // Preenchido automaticamente pelo AuthContext via JWT
        });

        // Redireciona com base no escopo e modo
        if (payload.scope === 'Master') {
          // Se logou como Master na raiz do Master
          if (masterMode) {
            // Em App.tsx a rota master está na raiz '/'
            navigate('/');
          } else {
            // Logou como Master através da tela de uma pizzaria (Invisível)
            // Continua na pizzaria, mas com acesso de Master
            navigate('/admin/orders');
          }
        } else {
          // Tenant normal
          navigate('/admin/orders');
        }
      } else {
        setError(data.message || 'Falha na autenticação.');
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 400) {
         setError(err.response?.data?.message || 'Credenciais inválidas.');
      } else {
         setError('Ocorreu um erro no servidor. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          {masterMode ? (
            <span className="tenant-badge master">
              Acesso Global
            </span>
          ) : (
            <span className="tenant-badge">Área Restrita</span>
          )}
          <h1>{masterMode ? 'Master Login' : 'Acesso ao Sistema'}</h1>
          <p>
            {masterMode 
              ? 'Área exclusiva para administração do SaaS' 
              : `Gerencie a sua loja conectada ao ${tenantSlug}`}
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">E-mail de acesso</label>
            <div style={{ position: 'relative' }}>
              <Mail className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock className="absolute left-3 top-3 text-gray-400" size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: '#a0aabf' }} />
              <input
                id="password"
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

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
