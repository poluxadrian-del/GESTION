import { useState } from 'react'
import { X } from 'lucide-react'
import { usePagos } from '@/hooks/usePagos'
import type { Pago } from '@/types'
import { formatDate } from '@/utils/formatters'

interface ModalReestructurarCalendarioProps {
  pagos: Pago[]
  onClose: () => void
  onSuccess: () => void
}

export default function ModalReestructurarCalendario({
  pagos,
  onClose,
  onSuccess,
}: ModalReestructurarCalendarioProps) {
  const { actualizarMultiplesFechas, loading } = usePagos()
  const [proximaFecha, setProximaFecha] = useState('')
  const [preview, setPreview] = useState<Array<{ numero: number; fecha: string }>>([])

  // Filtrar solo pagos pendientes
  const pagosPendientes = pagos.filter((p) => p.estado === 'pendiente')

  const calcularFechas = (fechaInicial: string) => {
    if (!fechaInicial) {
      setPreview([])
      return
    }

    try {
      const [year, month, day] = fechaInicial.split('-').map(Number)
      const previsualizacion = []

      for (let i = 0; i < pagosPendientes.length; i++) {
        const fecha = new Date(year, month - 1, day)
        fecha.setMonth(fecha.getMonth() + i)

        const y = fecha.getFullYear()
        const m = String(fecha.getMonth() + 1).padStart(2, '0')
        const d = String(fecha.getDate()).padStart(2, '0')
        const fechaFormato = `${y}-${m}-${d}`

        previsualizacion.push({
          numero: pagosPendientes[i].numero_pago,
          fecha: fechaFormato,
        })
      }

      setPreview(previsualizacion)
    } catch (error) {
      console.error('Error al calcular fechas:', error)
      setPreview([])
    }
  }

  const handleFechaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value
    setProximaFecha(fecha)
    calcularFechas(fecha)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!proximaFecha || preview.length === 0) {
      alert('Por favor selecciona una fecha válida')
      return
    }

    // Crear actualizaciones
    const actualizaciones = pagosPendientes.map((pago, index) => ({
      pagoId: pago.id,
      nuevaFecha: preview[index].fecha,
    }))

    const success = await actualizarMultiplesFechas(actualizaciones)
    if (success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md my-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Reestructurar Calendario</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {pagosPendientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay pagos pendientes para reestructurar</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input de fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Próxima fecha de pago *
              </label>
              <input
                type="date"
                value={proximaFecha}
                onChange={handleFechaChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Las demás cuotas se calcularán sumando 1 mes automáticamente
              </p>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-700 mb-2">Previsualización:</p>
                <div className="space-y-1">
                  {preview.map((item) => (
                    <div key={item.numero} className="flex justify-between text-xs text-gray-600">
                      <span>Cuota {item.numero}:</span>
                      <span className="font-medium text-blue-600">{formatDate(item.fecha)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen */}
            {preview.length > 0 && (
              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-800">
                <p>
                  <strong>{preview.length}</strong> cuotas serán actualizadas
                </p>
              </div>
            )}

            {/* Botones */}
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
                disabled={loading || preview.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
