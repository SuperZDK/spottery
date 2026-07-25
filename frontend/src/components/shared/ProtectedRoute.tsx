import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "@/stores/authStore"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVIP?: boolean
}

export default function ProtectedRoute({ children, requireVIP }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token)
  const isVIP = useAuthStore((s) => s.isVIP)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireVIP && !isVIP()) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
