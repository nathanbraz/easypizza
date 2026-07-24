import axios from 'axios';

// Base URL for the .NET backend API
// During development, standard .NET API runs on https://localhost:7202 or http://localhost:5057
const API_BASE_URL = 'http://localhost:5057/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Extracts the Tenant Slug from the URL.
 * Example: For easypizza.com/pizzariabrazil/menu, it extracts "pizzariabrazil"
 * For local testing: http://localhost:3333/pizzariabrazil returns "pizzariabrazil"
 */
export const getTenantSlugFromUrl = (): string => {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  
  // We assume the first path segment is ALWAYS the tenant slug, unless it's a generic landing page
  if (pathParts.length > 0) {
      return pathParts[0]; 
  }
  
  // Fallback for development if no slug is provided
  return 'pizzariabrazil'; 
};
