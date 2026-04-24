import { Eye, Edit2, Calendar } from 'lucide-react'
import type { Cliente } from '@/types'
import { formatCurrency } from '@/utils/formatters'

interface ClientesTableProps {
  clientes: Cliente[]
  loading: boolean
  onSelectCliente: (cliente: Cliente) => void
  onEditCliente: (cliente: Cliente) => void
  onViewCalendar: (cliente: Cliente) => void
}

export default function ClientesTable({
  clientes,
  loading,
  onSelectCliente,
  onEditCliente,
  onViewCalendar,
}: ClientesTableProps) {
  if (loading) {
    return (
      <div className="p-6 text-center bg-white rounded-lg shadow">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Cargando clientes...</p>
      </div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="p-6 text-center bg-white rounded-lg shadow">
        <p className="text-gray-500">No hay clientes registrados</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contrato</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Cliente</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Día Pago</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Gestor</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Saldo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientes.map(cliente => (
              <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-xs text-gray-900">{cliente.numero_contrato}</td>
                <td className="px-6 py-3 text-xs text-gray-900">{cliente.nombre_completo}</td>
                <td className="px-6 py-3 text-gray-600 text-xs">Día {cliente.dia_pago}</td>
                <td className="px-6 py-3 text-gray-600 text-xs">{cliente.gestor?.nombre || '-'}</td>
                <td className="px-6 py-3 font-semibold text-xs text-red-600">{formatCurrency(cliente.saldo)}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    cliente.estado === 'activo' ? 'bg-green-100 text-green-800' :
                    cliente.estado === 'pausa' ? 'bg-yellow-100 text-yellow-800' :
                    cliente.estado === 'liquidado' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {cliente.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                  <button
                    onClick={() => onSelectCliente(cliente)}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                    title="Ver Detalles"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => onEditCliente(cliente)}
                    className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => onViewCalendar(cliente)}
                    className="p-2 hover:bg-green-50 text-green-600 rounded-lg"
                    title="Ver Calendario"
                  >
                    <Calendar size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
