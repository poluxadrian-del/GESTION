import { useEffect, useState } from 'react'
import { usePagos } from '@/hooks/usePagos'
import ClientesConPendientesAlDia from '@/components/dashboard/ClientesConPendientesAlDia'

interface PendientesData {
  totalClientesConPendientes: number;
  totalVencido: number;
  totalClientes: number;
  porGestor: Array<{
    gestorId: string;
    gestorNombre: string;
    clientesConPendientes: number;
    totalClientesGestor: number;
    totalVencidoGestor: number;
  }>;
}

export default function DashboardPage() {
  const { obtenerClientesPendientesAlDia, loading } = usePagos()
  const [pendientesData, setPendientesData] = useState<PendientesData>({
    totalClientesConPendientes: 0,
    totalVencido: 0,
    totalClientes: 0,
    porGestor: [],
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    const pendientes = await obtenerClientesPendientesAlDia()
    if (pendientes) {
      setPendientesData(pendientes)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Pagos vencidos y seguimiento de cobranza</p>
      </div>

      {/* Clientes con pendientes al día */}
      <div className="mb-8">
        <ClientesConPendientesAlDia
          totalClientesConPendientes={pendientesData.totalClientesConPendientes}
          totalVencido={0}
          totalClientes={0}
          porGestor={pendientesData.porGestor}
          loading={loading}
        />
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
