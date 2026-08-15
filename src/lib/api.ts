import axios from 'axios';

// URL base da API backend em .NET. Configurável via VITE_API_URL (ver docker-compose.yml deste
// repo) para não depender de um valor fixo entre dev/staging/produção — default cobre o dev local.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

/**
 * Verifica se o host atual ou URL é do painel Master.
 * Suporta admin.easypizza.com.br, admin.lvh.me ou fallback para localhost/master.
 */
export const isMaster = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.') || 
         hostname === 'admin.localhost' || 
         window.location.pathname.startsWith('/master');
};

const LAST_TENANT_SLUG_KEY = '@EasyPizza:LastTenantSlug';

// Rotas de primeiro nível que não representam um slug de tenant. Precisa ficar em sincronia com
// as rotas de nível raiz declaradas em App.tsx (fora de "/:tenantSlug").
const NON_TENANT_PATH_SEGMENTS = ['admin', 'master', 'tracker', 'addresses', 'login'];

/**
 * Extrai o Slug do Tenant a partir do hostname (subdomínio) da URL.
 * Exemplo: Para pizzatop.lvh.me:3333, retorna "pizzatop".
 * Para fallback de testes locais sem subdomínio, verifica o caminho (pathname).
 * Rotas sem slug na URL (ex: /tracker/123, que não carrega o tenant no path) usam o último
 * slug resolvido nesta sessão — sem isso, cairiam sempre num tenant fixo errado.
 */
export const getTenantSlugFromUrl = (): string => {
  const hostname = window.location.hostname; // ex. "pizzatop.lvh.me" ou "pizzatop.easypizza.com.br"

  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    // Evita retornar www, api, localhost ou admin como um slug de pizzaria
    if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] != 'api' && parts[0] !== 'admin' && parts[0] !== 'master') {
      localStorage.setItem(LAST_TENANT_SLUG_KEY, parts[0]);
      return parts[0];
    }
  }

  // Fallback de caminho para desenvolvimento no localhost sem subdomínio (ex. localhost:3333/pizzariabrazil)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && !NON_TENANT_PATH_SEGMENTS.includes(pathParts[0])) {
      localStorage.setItem(LAST_TENANT_SLUG_KEY, pathParts[0]);
      return pathParts[0];
  }

  // Rota sem slug na própria URL (ex: /tracker) — usa o último tenant resolvido nesta sessão
  const lastKnown = localStorage.getItem(LAST_TENANT_SLUG_KEY);
  return lastKnown || 'pizzariabrazil';
};

// Chaves de localStorage separadas de propósito: o JWT de staff (lojista/master) e o token de
// sessão do cliente final (magic link) são mecanismos de autenticação completamente diferentes
// e não devem compartilhar namespace nem header HTTP (ver docs/implementation_plan.md, BUG-04).
export const STAFF_TOKEN_KEY = '@EasyPizza:StaffToken';
export const CUSTOMER_SESSION_TOKEN_KEY = '@EasyPizza:CustomerSessionToken';
const CUSTOMER_SESSION_HEADER = 'X-Customer-Session';

// Request interceptor para anexar automaticamente o cabeçalho X-Tenant-Slug a cada requisição
api.interceptors.request.use((config) => {
  if (!isMaster()) {
    const slug = getTenantSlugFromUrl();
    if (slug) {
      config.headers['X-Tenant-Slug'] = slug;
    }
  }

  // Anexar JWT de staff (lojista/master), se existir
  const staffToken = localStorage.getItem(STAFF_TOKEN_KEY);
  if (staffToken) {
    config.headers['Authorization'] = `Bearer ${staffToken}`;
  }

  // Anexar token de sessão do cliente final (magic link), se existir
  const customerSessionToken = localStorage.getItem(CUSTOMER_SESSION_TOKEN_KEY);
  if (customerSessionToken) {
    config.headers[CUSTOMER_SESSION_HEADER] = customerSessionToken;
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

    if (error.response?.status === 400 && msg && (msg.includes('Tenant') || msg.includes('Empresa') || msg.includes('SaaS'))) {
      console.error("[SaaS] Empresa/Tenant não encontrado. Disparando evento global...");
      window.dispatchEvent(new Event('tenant-not-found'));
    }

    if (error.response?.status === 403 && msg && msg.includes('TenantSuspended')) {
      console.error("[SaaS] Tenant suspenso por inadimplência. Disparando evento global...");
      window.dispatchEvent(new Event('tenant-suspended'));
    }

    // Tratamento global para 401 Unauthorized — limpa só o mecanismo que foi de fato usado na requisição
    if (error.response?.status === 401) {
      const requestHeaders = error.config?.headers;
      const usedCustomerSession = !!requestHeaders?.[CUSTOMER_SESSION_HEADER];

      if (usedCustomerSession) {
        console.error("[Auth] Sessão de cliente expirada ou inválida.");
        localStorage.removeItem(CUSTOMER_SESSION_TOKEN_KEY);
        window.dispatchEvent(new Event('customer-session-expired'));
      } else {
        console.error("[Auth] Sessão de staff expirada ou não autenticado.");
        localStorage.removeItem(STAFF_TOKEN_KEY);
        window.dispatchEvent(new Event('unauthorized-access'));
      }
    }

    return Promise.reject(error);
  }
);

