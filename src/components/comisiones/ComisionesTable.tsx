import { Check } from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils/formatters'
import type { ClienteConComision } from '@/hooks/useComisiones'

interface ComisionesTableProps {
  clientes: ClienteConComision[]
  loading: boolean
  onMarcarComision: (clienteId: string) => Promise<void>
}

export default function ComisionesTable({
  clientes,
  loading,
  onMarcarComision,
}: ComisionesTableProps) {
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay clientes pendientes de pagar comisión
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Cliente</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Contrato</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Vendedor</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Gestor</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Fecha 1er Pago</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">Total Pagado</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-900 text-xs">Notas</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-900 text-xs">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {clientes.map(cliente => (
            <tr key={cliente.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 text-xs">
                {cliente.nombre_completo}
              </td>
              <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                {cliente.numero_contrato}
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs">
                {cliente.vendedor || '-'}
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs">
                {cliente.gestor?.nombre || '-'}
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs">
                {cliente.pagos_info?.primer_pago_fecha 
                  ? formatDate(cliente.pagos_info.primer_pago_fecha)
                  : '-'
                }
              </td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">
                {formatCurrency(cliente.total_pagado)}
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs max-w-xs truncate" title={cliente.notas}>
                {cliente.notas || '-'}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => onMarcarComision(cliente.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded hover:bg-green-200 transition-colors"
                  title="Marcar comisión como pagada"
                >
                  <Check size={14} />
                  Pagar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
