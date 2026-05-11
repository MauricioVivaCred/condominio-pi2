import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUser } from "../features/auth/services/auth";
import { canAccessRoute } from "../config/rbac";
import type { PlanId } from "../config/plans";

type Props = {
  children: ReactNode;
  path?: string;
  // Legacy props mantidos para compatibilidade
  adminOnly?: boolean;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, path, adminOnly, allowedRoles }: Props) {
  const token = getToken();
  const user = getUser();

  if (!token) return <Navigate to="/login" replace />;

  if (user?.role === "MASTER_ADMIN") return children;

  // Validação via RBAC centralizado (se path for informado)
  if (path) {
    const allowed = canAccessRoute(path, user?.role, (user as any)?.plan as PlanId ?? null);
    if (!allowed) return <Navigate to="/dashboard" replace />;
    return children;
  }

  // Fallback: legacy adminOnly / allowedRoles
  if (adminOnly && user?.role !== "ADMIN") return <Navigate to="/dashboard" replace />;
  if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
