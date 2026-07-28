import axios from 'axios';

// URL base para a API backend em .NET
// Durante o desenvolvimento, a API .NET padrão roda em https://localhost:5001 ou http://localhost:5000
export const api = axios.create({
  // Use a porta fixa do backend configurada
  baseURL: 'http://localhost:5000/api',
});

/**
 * Verifica se o host atual ou URL é do painel SuperAdmin.
 * Suporta admin.easypizza.com.br, admin.lvh.me ou fallback para localhost/superadmin.
 */
export const isSuperAdmin = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.') || 
         hostname === 'admin.localhost' || 
         window.location.pathname.startsWith('/superadmin');
};

/**
 * Extrai o Slug do Tenant a partir do hostname (subdomínio) da URL.
 * Exemplo: Para pizzatop.lvh.me:3333, retorna "pizzatop".
 * Para fallback de testes locais sem subdomínio, verifica o caminho (pathname) ou usa "pizzariabrazil" por padrão.
 */
export const getTenantSlugFromUrl = (): string => {
  const hostname = window.location.hostname; // ex. "pizzatop.lvh.me" ou "pizzatop.easypizza.com.br"
  
  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    // Evita retornar www, api, localhost ou admin como um slug de pizzaria
    if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] != 'api' && parts[0] !== 'admin' && parts[0] !== 'superadmin') {
      return parts[0];
    }
  }
  
  // Fallback de caminho para desenvolvimento no localhost sem subdomínio (ex. localhost:3333/pizzariabrazil)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && pathParts[0] !== 'admin' && pathParts[0] !== 'superadmin' && pathParts[0] !== 'tracker') {
      return pathParts[0]; 
  }
  
  // Tenant padrão de fallback para desenvolvimento
  return 'pizzariabrazil'; 
};

// Request interceptor para anexar automaticamente o cabeçalho X-Tenant-Slug a cada requisição
api.interceptors.request.use((config) => {
  if (!isSuperAdmin()) {
    const slug = getTenantSlugFromUrl();
    if (slug) {
      config.headers['X-Tenant-Slug'] = slug;
    }
  }
  return config;
});

// Response interceptor para capturar erros globais de Tenant Não Encontrado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o backend retornar o nosso erro específico de SaaS 400
    const data = error.response?.data;
    const msg = typeof data === 'string' ? data : data?.message;
    
    if (error.response?.status === 400 && msg && msg.includes('Tenant')) {
      console.error("[SaaS] Tenant não encontrado. Disparando evento global...");
      window.dispatchEvent(new Event('tenant-not-found'));
    }
    return Promise.reject(error);
  }
);

