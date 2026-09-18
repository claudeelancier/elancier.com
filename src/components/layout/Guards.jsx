import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function RequireAuth({ children, role }) {
  const user = useAuthStore((s) => s.user)
  const currentRole = useAuthStore((s) => s.role)
  const location = useLocation()

  if (!user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{ from: location.pathname }} />
  }
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />
  }
  return children
}

export function GuestOnly({ children }) {
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  if (user && role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}
