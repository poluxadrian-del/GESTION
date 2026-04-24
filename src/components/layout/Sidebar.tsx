import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { LayoutGrid, Users, UserCheck, CreditCard, BarChart3, LogOut, X } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario, logout } = useAuthStore()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutGrid, roles: ['socio', 'admin', 'supervisor'] },
    { path: '/clientes', label: 'Clientes', icon: Users, roles: ['socio', 'admin', 'supervisor'] },
    { path: '/gestores', label: 'Gestores', icon: UserCheck, roles: ['socio', 'admin'] },
    { path: '/cobranza', label: 'Cobranza', icon: CreditCard, roles: ['socio', 'admin', 'supervisor'] },
    { path: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['socio', 'admin', 'supervisor'] },
  ]

  const filteredItems = navItems.filter(item =>
    usuario?.rol && item.roles.includes(usuario.rol)
  )

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Backdrop para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg
        transform lg:transform-none transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-blue-600">Formex</h1>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {filteredItems.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    toggleSidebar()
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Footer - User Info */}
          <div className="border-t border-gray-200 p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide">Usuario</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {usuario?.nombre_completo}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {usuario?.rol}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
