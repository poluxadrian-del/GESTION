import { useEffect, useState } from 'react'
import { usePagos } from '@/hooks/usePagos'
import TotalClientesActivos from '@/components/dashboard/TotalClientesActivos'
import ClientesPorGestor from '@/components/dashboard/ClientesPorGestor'

interface DashboardData {
  totalClientesActivos: number;
  clientesPorGestor: Array<{
    gestorId: string;
    gestor: {
      id: string;
      nombre: string;
    } | null;
    totalClientes: number;
    clientesCobrados: number;
    porcentajeCobrado: number;
  }>;
}

export default function DashboardPage() {
  const { obtenerDashboardMesActual, loading } = usePagos()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalClientesActivos: 0,
    clientesPorGestor: [],
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    const data = await obtenerDashboardMesActual()
    if (data) {
      setDashboardData(data)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Pagos vencidos y seguimiento de cobranza</p>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Total de clientes activos - ocupa 1 columna */}
        <div className="lg:col-span-1 xl:col-span-1">
          <TotalClientesActivos
            total={dashboardData.totalClientesActivos}
            loading={loading}
          />
        </div>

        {/* Clientes por gestor - ocupa el resto */}
        <div className="lg:col-span-1 xl:col-span-3">
          <ClientesPorGestor
            datos={dashboardData.clientesPorGestor}
            loading={loading}
          />
        </div>
      </div>

      {/* Botón para actualizar datos */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Actualizando...' : 'Actualizar Datos'}
        </button>
      </div>
    </div>
  )
}
