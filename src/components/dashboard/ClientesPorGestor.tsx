import { AlertCircle } from 'lucide-react'

interface ClientePorGestorData {
  gestorId: string;
  gestor: {
    id: string;
    nombre: string;
  } | null;
  totalClientes: number;
  clientesCobrados: number;
  porcentajeCobrado: number;
}

interface ClientesPorGestorProps {
  datos: ClientePorGestorData[];
  loading: boolean;
}

export default function ClientesPorGestor({ datos, loading }: ClientesPorGestorProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-600" />
          Clientes con Pagos Vencidos por Gestor
        </h3>
        <div className="text-center py-8 text-gray-500">Cargando datos...</div>
      </div>
    )
  }

  if (datos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-600" />
          Clientes con Pagos Vencidos por Gestor
        </h3>
        <div className="text-center py-8 text-gray-500">¡Excelente! No hay pagos vencidos</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <AlertCircle size={20} className="text-red-600" />
        Clientes con Pagos Vencidos por Gestor
      </h3>
      
      <div className="space-y-3">
        {datos.map((item) => (
          <div key={item.gestorId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                {item.gestor?.nombre || 'Gestor desconocido'}
              </p>
              <p className="text-xs text-gray-500">
                {item.totalClientes} cliente{item.totalClientes !== 1 ? 's' : ''} sin cobrar
              </p>
            </div>
            <div className="bg-red-100 px-3 py-1 rounded-full">
              <p className="text-sm font-bold text-red-700">
                {item.totalClientes}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
