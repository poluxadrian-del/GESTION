import { useState } from 'react'
import { AlertCircle, CheckCircle, X, Download as DownloadIcon } from 'lucide-react'
import type { ClienteExcelRow } from '@/utils/importExcel'
import type { Gestor } from '@/types'
import { exportarPlantillaClientes } from '@/utils/exportExcel'

interface ModalImportarClientesProps {
  isOpen: boolean
  clientesValidos: ClienteExcelRow[]
  erroresValidacion: { fila: number; error: string }[]
  gestores: Gestor[]
  onImportar: (clientes: ClienteExcelRow[], gestorSeleccionado?: string) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export default function ModalImportarClientes({
  isOpen,
  clientesValidos,
  erroresValidacion,
  gestores,
  onImportar,
  onCancel,
  loading = false
}: ModalImportarClientesProps) {
  const [gestorSeleccionado, setGestorSeleccionado] = useState<string>('')
  const [importando, setImportando] = useState(false)

  if (!isOpen) return null

  const handleImportar = async () => {
    if (clientesValidos.length === 0) {
      alert('No hay clientes válidos para importar')
      return
    }

    setImportando(true)
    try {
      await onImportar(clientesValidos, gestorSeleccionado || undefined)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Importar Clientes</h2>
          <button
            onClick={onCancel}
            disabled={importando}
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
                <span className="text-sm font-medium text-gray-700">Válidos</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{clientesValidos.length}</div>
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
              <div className="text-2xl font-bold text-blue-600">{clientesValidos.length + erroresValidacion.length}</div>
            </div>
          </div>

          {/* Selector de Gestor */}
          {clientesValidos.some(c => !c.gestor_nombre) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Asignar Gestor (para clientes sin gestor especificado)
              </label>
              <select
                value={gestorSeleccionado}
                onChange={(e) => setGestorSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Seleccionar gestor --</option>
                {gestores.map((gestor) => (
                  <option key={gestor.id} value={gestor.id}>
                    {gestor.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                Si no asignas un gestor aquí, deberá estar especificado en la columna "gestor_nombre" del Excel
              </p>
            </div>
          )}

          {/* Errores */}
          {erroresValidacion.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-3">Errores encontrados:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {erroresValidacion.map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    <strong>Fila {error.fila}:</strong> {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview de clientes válidos */}
          {clientesValidos.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Clientes a importar:</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Contrato</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Nombre</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Email</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Gestor</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Precio Venta</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesValidos.slice(0, 10).map((cliente, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900">{cliente.numero_contrato}</td>
                        <td className="px-4 py-2 text-gray-900">{cliente.nombre_completo}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{cliente.email || '-'}</td>
                        <td className="px-4 py-2 text-gray-600 text-xs">{cliente.gestor_nombre || '-'}</td>
                        <td className="px-4 py-2 text-gray-900">${cliente.precio_venta?.toFixed(2) || '0.00'}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                            cliente.estado === 'activo' ? 'bg-green-100 text-green-800' :
                            cliente.estado === 'pausa' ? 'bg-yellow-100 text-yellow-800' :
                            cliente.estado === 'liquidado' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {cliente.estado || 'inicio'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {clientesValidos.length > 10 && (
                <p className="text-xs text-gray-600 mt-2">y {clientesValidos.length - 10} cliente(s) más...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={() => exportarPlantillaClientes()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            <DownloadIcon size={18} />
            Descargar Plantilla
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={importando}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportar}
              disabled={importando || clientesValidos.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importando && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {importando ? 'Importando...' : `Importar ${clientesValidos.length} cliente(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
