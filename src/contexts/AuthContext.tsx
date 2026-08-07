import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface UserInfo {
  id: string;
  name: string;
  userName: string;
  role: string;
  scope: 'Master' | 'Tenant';
  tenantSlug?: string;
  permissions: string[];
}

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

/**
 * Decodifica o payload do JWT e extrai as claims "Permission".
 * Não valida a assinatura (isso é responsabilidade do backend).
 */
function decodePermissionsFromToken(token: string): string[] {
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));

    // As claims "Permission" podem vir como string (1 permissão) ou array (várias)
    if (!payload.Permission) return [];
    if (Array.isArray(payload.Permission)) return payload.Permission;
    return [payload.Permission];
  } catch {
    return [];
  }
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const storedUser = localStorage.getItem('@EasyPizza:User');
    const storedToken = localStorage.getItem('@EasyPizza:Token');
    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        // Se o user antigo não tem permissions, decodifica do token
        if (!parsed.permissions) {
          parsed.permissions = decodePermissionsFromToken(storedToken);
          localStorage.setItem('@EasyPizza:User', JSON.stringify(parsed));
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {

    // Escuta o evento global do interceptor Axios para logout forçado
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('unauthorized-access', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized-access', handleUnauthorized);
    };
  }, []);

  const login = (token: string, userInfo: UserInfo) => {
    // Extrair permissões do JWT automaticamente
    const permissions = decodePermissionsFromToken(token);
    const userWithPermissions = { ...userInfo, permissions };

    localStorage.setItem('@EasyPizza:Token', token);
    localStorage.setItem('@EasyPizza:User', JSON.stringify(userWithPermissions));
    setUser(userWithPermissions);
  };

  const logout = async () => {
    const token = localStorage.getItem('@EasyPizza:Token');
    if (token) {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.warn("Sessão no backend já expirou ou servidor indisponível.", err);
      }
    }
    
    localStorage.removeItem('@EasyPizza:Token');
    localStorage.removeItem('@EasyPizza:User');
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions?.includes(permission) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

