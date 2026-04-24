import { useState } from 'react'
import { X } from 'lucide-react'
import { usePagos } from '@/hooks/usePagos'
import type { Pago } from '@/types'
import { formatDate } from '@/utils/formatters'

interface ModalEditarFechaPagoProps {
  pago: Pago
  onClose: () => void
  onSuccess: () => void
}

export default function ModalEditarFechaPago({
  pago,
  onClose,
  onSuccess,
}: ModalEditarFechaPagoProps) {
  const { actualizarFechaProgramada, loading } = usePagos()
  const [nuevaFecha, setNuevaFecha] = useState(pago.fecha_programada)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nuevaFecha) {
      alert('Por favor selecciona una fecha')
      return
    }

    const success = await actualizarFechaProgramada(pago.id, nuevaFecha)
    if (success) {
      onSuccess()
    }
  }

  const clienteNombre = (pago.cliente as any)?.nombre_completo || 'Cliente'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Cambiar Fecha Programada</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Cliente:</span> {clienteNombre}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Cuota:</span> {pago.numero_pago}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Fecha Actual:</span> {formatDate(pago.fecha_programada)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Fecha Programada *
            </label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs text-blue-800">
            <p className="font-semibold mb-1">⚠️ Nota importante:</p>
            <p>Al cambiar la fecha, el sistema recalculará automáticamente el estado del pago (pendiente, vencido, etc.)</p>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Actualizar Fecha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
