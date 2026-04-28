import { AlertCircle } from 'lucide-react'

interface ClientesConPendientesAlDiaProps {
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
  loading: boolean;
}

export default function ClientesConPendientesAlDia({
  totalClientesConPendientes,
  porGestor,
  loading,
}: ClientesConPendientesAlDiaProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Card Total Clientes Vencidos */}
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg shadow-md p-4 border-l-4 border-red-500">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-red-700 font-medium">Clientes con</p>
            <p className="text-sm text-red-700 font-medium">Pagos Vencidos</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{totalClientesConPendientes}</p>
            <p className="text-xs text-red-600 mt-1">Pendiente de cobro</p>
          </div>
          <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
            <AlertCircle className="text-red-600" size={24} />
          </div>
        </div>
      </div>

      {/* Card Clientes por Gestor */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="text-red-600" size={20} />
          <h3 className="text-sm font-semibold text-gray-900">Clientes con Pagos Vencidos por Gestor</h3>
        </div>

        <div className="space-y-1">
          {porGestor.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-2">
              No hay gestores registrados
            </div>
          ) : (
            porGestor.map((g) => (
              <div key={g.gestorId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{g.gestorNombre}</p>
                  <p className="text-xs text-red-600">{g.clientesConPendientes} clientes sin cobrar</p>
                </div>
                <p className="text-xl font-bold text-red-600">{g.clientesConPendientes}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
