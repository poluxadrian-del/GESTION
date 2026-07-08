import { useState } from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'
import type { ClienteActualizacionExcelRow } from '@/utils/importExcelActualizaciones'

interface ModalActualizarClientesExcelProps {
  isOpen: boolean
  actualizacionesValidas: ClienteActualizacionExcelRow[]
  erroresValidacion: { fila: number; error: string }[]
  onActualizar: (actualizaciones: ClienteActualizacionExcelRow[]) => Promise<void>
  onCancel: () => void
}

export default function ModalActualizarClientesExcel({
  isOpen,
  actualizacionesValidas,
  erroresValidacion,
  onActualizar,
  onCancel
}: ModalActualizarClientesExcelProps) {
  const [actualizando, setActualizando] = useState(false)

  if (!isOpen) return null

  const handleActualizar = async () => {
    if (actualizacionesValidas.length === 0) {
      alert('No hay actualizaciones válidas')
      return
    }

    setActualizando(true)
    try {
      await onActualizar(actualizacionesValidas)
    } finally {
      setActualizando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Actualizar Clientes</h2>
          <button
            onClick={onCancel}
            disabled={actualizando}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="text-green-600" size={20} />
                <span className="text-sm font-medium text-gray-700">Válidas</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{actualizacionesValidas.length}</div>
            </div>

            <div className={`${erroresValidacion.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'} rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={erroresValidacion.length > 0 ? 'text-red-600' : 'text-gray-400'} size={20} />
                <span className="text-sm font-medium text-gray-700">Errores</span>
              </div>
              <div className={`text-2xl font-bold ${erroresValidacion.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {erroresValidacion.length}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">Total</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{actualizacionesValidas.length + erroresValidacion.length}</div>
            </div>
          </div>

          {/* Errores */}
          {erroresValidacion.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-3">Errores encontrados:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {erroresValidacion.map((error, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    <strong>Fila {error.fila}:</strong> {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview de datos válidos */}
          {actualizacionesValidas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-3">Actualizaciones a realizar:</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-blue-900 font-medium">Número Contrato</th>
                      <th className="px-3 py-2 text-left text-blue-900 font-medium">Nuevo Contrato</th>
                      <th className="px-3 py-2 text-left text-blue-900 font-medium">Cargo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actualizacionesValidas.slice(0, 10).map((act, idx) => (
                      <tr key={idx} className="border-t border-blue-200 hover:bg-blue-100">
                        <td className="px-3 py-2 text-blue-900">{act.numero_contrato}</td>
                        <td className="px-3 py-2 text-blue-900">{act.nuevo_contrato || '-'}</td>
                        <td className="px-3 py-2 text-blue-900">{act.cargo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {actualizacionesValidas.length > 10 && (
                  <div className="text-sm text-blue-600 text-center py-2 border-t border-blue-200">
                    ... y {actualizacionesValidas.length - 10} más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={actualizando}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleActualizar}
            disabled={actualizando || actualizacionesValidas.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {actualizando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
