import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar permissões do usuário logado.
 * Retorna true se o usuário possui a permissão informada.
 *
 * Uso: const canViewTenants = usePermission('Tenants:View');
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();

  if (!user) return false;

  return user.permissions?.includes(permission) ?? false;
}

/**
 * Hook para verificar múltiplas permissões de uma vez.
 * Retorna true se o usuário possui TODAS as permissões informadas.
 */
export function usePermissions(permissions: string[]): boolean {
  const { user } = useAuth();

  if (!user) return false;

  return permissions.every(p => user.permissions?.includes(p) ?? false);
}

/**
 * Hook para verificar se o usuário possui QUALQUER UMA das permissões informadas.
 */
export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();

  if (!user) return false;

  return permissions.some(p => user.permissions?.includes(p) ?? false);
}
