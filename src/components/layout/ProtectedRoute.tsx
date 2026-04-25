import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { usuario, loading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Solo redirigir si ya terminó de cargar y NO hay usuario
    if (!loading && !usuario) {
      navigate('/login', { replace: true })
    }
  }, [usuario, loading, navigate])

  // Mientras está cargando, mostrar loading
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

  // Si terminó de cargar y hay usuario, mostrar contenido
  // Si terminó de cargar y NO hay usuario, el effect anterior redirigirá al login
  return usuario ? <>{children}</> : null
}
