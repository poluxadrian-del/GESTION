import { Clock, Plus } from 'lucide-react'
import type { Pago } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface PagosTableProps {
  pagos: Pago[]
  loading: boolean
  onSelectPago: (pago: Pago) => void
  onSelectSeguimiento: (pago: Pago) => void
  canRegister?: boolean
}

export default function PagosTable({ 
  pagos, 
  loading, 
  onSelectPago, 
  onSelectSeguimiento,
  canRegister = true,
}: PagosTableProps) {
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (pagos.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay pagos pendientes
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cuota</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Fecha Programada</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Monto</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
            <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Seguimiento</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {pagos.map(pago => (
            <tr key={pago.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">
                {(pago.cliente as any)?.nombre_completo}
              </td>
              <td className="px-6 py-4 text-gray-600">
                Cuota {pago.numero_pago}
              </td>
              <td className="px-6 py-4 text-gray-600">
                {formatDate(pago.fecha_programada)}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900">
                {formatCurrency(pago.monto_programado)}
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1 w-fit">
                  <Clock size={14} />
                  Pendiente
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => onSelectSeguimiento(pago)}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded hover:bg-purple-200"
                  title="Registrar nuevo seguimiento"
                >
                  <Plus size={14} />
                  Registrar
                </button>
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onSelectPago(pago)}
                  disabled={!canRegister}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    canRegister
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title={canRegister ? 'Registrar pago' : 'No tienes permisos para registrar pagos'}
                >
                  Registrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
