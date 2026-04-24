import { Trash2, Edit2 } from 'lucide-react'
import type { Gestor } from '@/types'
import { formatDate } from '@/utils/formatters'

interface GestoresTableProps {
  gestores: Gestor[]
  loading: boolean
  onEditGestor: (gestor: Gestor) => void
  onDeleteGestor: (id: string) => void
}

export default function GestoresTable({
  gestores,
  loading,
  onEditGestor,
  onDeleteGestor,
}: GestoresTableProps) {
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Cargando gestores...</p>
      </div>
    )
  }

  if (gestores.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No hay gestores registrados</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Nombre</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Estado</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Creado</th>
            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {gestores.map(gestor => (
            <tr key={gestor.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <p className="font-medium text-gray-900">{gestor.nombre}</p>
              </td>
              <td className="px-6 py-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  gestor.activo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {gestor.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatDate(gestor.created_at)}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => onEditGestor(gestor)}
                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg inline-flex"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => onDeleteGestor(gestor.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg inline-flex"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
