import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { usePagos } from '@/hooks/usePagos'
import { useAuthStore } from '@/store/authStore'
import type { CalendarioPago } from '@/types'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'

interface ModalReestructurarCalendarioProps {
  clienteId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ModalReestructurarCalendario({
  clienteId,
  onClose,
  onSuccess,
}: ModalReestructurarCalendarioProps) {
  const { obtenerCalendarioPagos, actualizarMultiplesFechas, loading: hookLoading } = usePagos()
  const { usuario } = useAuthStore()
  const [proximaFecha, setProximaFecha] = useState('')
  const [preview, setPreview] = useState<Array<{ id: string; numero: number; fecha: string }>>([])
  const [calendarios, setCalendarios] = useState<CalendarioPago[]>([])
  const [loading, setLoading] = useState(false)

  // Verificar permisos
  const canReestructurar = usuario?.rol !== 'supervisor'

  // Cargar calendarios
  useEffect(() => {
    const cargar = async () => {
      const data = await obtenerCalendarioPagos(clienteId)
      setCalendarios(data)
    }
    cargar()
  }, [clienteId, obtenerCalendarioPagos])

  // Si es supervisor, cerrar automáticamente
  useEffect(() => {
    if (!canReestructurar) {
      toast.error('No tienes permisos para reestructurar el calendario')
      setTimeout(onClose, 1500)
    }
  }, [canReestructurar, onClose])

  // Filtrar solo cuotas pendientes
  const cuotasPendientes = calendarios.filter((c) => c.estado === 'pendiente')

  const calcularFechas = (fechaInicial: string) => {
    if (!fechaInicial) {
      setPreview([])
      return
    }

    try {
      const [year, month, day] = fechaInicial.split('-').map(Number)
      const previsualizacion = []

      for (let i = 0; i < cuotasPendientes.length; i++) {
        const fecha = new Date(year, month - 1, day)
        fecha.setMonth(fecha.getMonth() + i)

        const y = fecha.getFullYear()
        const m = String(fecha.getMonth() + 1).padStart(2, '0')
        const d = String(fecha.getDate()).padStart(2, '0')
        const fechaFormato = `${y}-${m}-${d}`

        previsualizacion.push({
          id: cuotasPendientes[i].id,
          numero: cuotasPendientes[i].numero_cuota,
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
      toast.error('Por favor selecciona una fecha válida')
      return
    }

    // Crear actualizaciones (ahora con calendarioPagoId)
    const actualizaciones = preview.map((item) => ({
      calendarioPagoId: item.id,
      nuevaFecha: item.fecha,
    }))

    setLoading(true)
    const success = await actualizarMultiplesFechas(actualizaciones)
    setLoading(false)

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

        {cuotasPendientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay cuotas pendientes para reestructurar</p>
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
                    <div key={item.id} className="flex justify-between text-xs text-gray-600">
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
                disabled={loading || hookLoading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || hookLoading || preview.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading || hookLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
