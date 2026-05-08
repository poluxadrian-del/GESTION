import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/types'

interface ProtectedRouteByRoleProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function ProtectedRouteByRole({ children, allowedRoles }: ProtectedRouteByRoleProps) {
  const { usuario, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !usuario) {
      navigate('/login', { replace: true })
      return
    }

    if (!loading && usuario && !allowedRoles.includes(usuario.rol)) {
      navigate('/', { replace: true })
    }
  }, [usuario, loading, navigate, allowedRoles])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return usuario && allowedRoles.includes(usuario.rol) ? <>{children}</> : null
}
