import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  scope: 'Master' | 'Tenant';
  tenantSlug?: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const storedUser = localStorage.getItem('@EasyPizza:User');
    const storedToken = localStorage.getItem('@EasyPizza:Token');
    if (storedUser && storedToken) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {

    // 2. Escuta o evento global do interceptor Axios para logout forçado
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('unauthorized-access', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized-access', handleUnauthorized);
    };
  }, []);

  const login = (token: string, userInfo: UserInfo) => {
    localStorage.setItem('@EasyPizza:Token', token);
    localStorage.setItem('@EasyPizza:User', JSON.stringify(userInfo));
    setUser(userInfo);
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

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
