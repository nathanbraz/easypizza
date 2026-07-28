import axios from 'axios';

// Base URL for the .NET backend API
// During development, standard .NET API runs on https://localhost:5001 or http://localhost:5000
export const api = axios.create({
  // Use a porta fixa do backend configurada
  baseURL: 'http://localhost:5000/api',
});

/**
 * Verifies if the current host or URL is the SuperAdmin dashboard.
 * Supports admin.easypizza.com.br, admin.lvh.me, or localhost/superadmin fallback.
 */
export const isSuperAdmin = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.startsWith('admin.') || 
         hostname === 'admin.localhost' || 
         window.location.pathname.startsWith('/superadmin');
};

/**
 * Extracts the Tenant Slug from the URL hostname (subdomain).
 * Example: For pizzatop.lvh.me:3333, returns "pizzatop".
 * For local testing fallback without subdomain, checks pathname or defaults to "pizzariabrazil".
 */
export const getTenantSlugFromUrl = (): string => {
  const hostname = window.location.hostname; // e.g. "pizzatop.lvh.me" or "pizzatop.easypizza.com.br"
  
  if (hostname.includes('.')) {
    const parts = hostname.split('.');
    // Avoid returning www, api, localhost, or admin as a pizzeria slug
    if (parts[0] !== 'www' && parts[0] !== 'localhost' && parts[0] != 'api' && parts[0] !== 'admin' && parts[0] !== 'superadmin') {
      return parts[0];
    }
  }
  
  // Path fallback for localhost development without subdomain (e.g. localhost:3333/pizzariabrazil)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && pathParts[0] !== 'admin' && pathParts[0] !== 'superadmin' && pathParts[0] !== 'tracker') {
      return pathParts[0]; 
  }
  
  // Fallback default tenant for dev
  return 'pizzariabrazil'; 
};

// Request interceptor to automatically attach X-Tenant-Slug header to every request
api.interceptors.request.use((config) => {
  if (!isSuperAdmin()) {
    const slug = getTenantSlugFromUrl();
    if (slug) {
      config.headers['X-Tenant-Slug'] = slug;
    }
  }
  return config;
});

