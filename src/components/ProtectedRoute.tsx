import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  requiredScope?: 'Master' | 'Tenant';
}

export default function ProtectedRoute({ requiredScope }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    // Redireciona para a tela de login mantendo a url de origem
    return <Navigate to="/login" replace />;
  }

  // Verifica permissão de escopo
  if (requiredScope && user.scope !== requiredScope) {
    // Se um tenant tentar acessar a área Master, volta pro login
    // Ou se tentarem misturar, volta pro login.
    return <Navigate to="/login" replace />;
  }

  // Se tudo ok, renderiza as rotas filhas
  return <Outlet />;
}
