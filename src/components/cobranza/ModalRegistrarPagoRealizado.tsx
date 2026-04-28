import { useEffect, useState } from 'react'
import { usePagos } from '@/hooks/usePagos'
import { useGestores } from '@/hooks/useGestores'
import { validarRegistroPagoRealizado } from '@/validations/pago-realizado'
import type { CalendarioPago, Cliente } from '@/types'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'

interface ModalRegistrarPagoRealizadoProps {
  clienteId: string
  cuota: CalendarioPago
  cliente?: Cliente
  onClose: () => void
  onSuccess: () => void
}

export default function ModalRegistrarPagoRealizado({
  clienteId,
  cuota,
  cliente,
  onClose,
  onSuccess
}: ModalRegistrarPagoRealizadoProps) {
  const { registrarPagoRealizado, loading } = usePagos()
  const { obtenerGestores } = useGestores()

  const [gestores, setGestores] = useState<any[]>([])
  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto_pagado: cuota.saldo_pendiente, // Proponer el saldo pendiente como monto
    gestor_id: cliente?.gestor_id || '', // Cargar gestor del cliente automáticamente
    notas: `Cuota ${cuota.numero_cuota}`
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const cargar = async () => {
      const data = await obtenerGestores()
      setGestores(data)
      // Si el cliente tiene gestor, pre-seleccionar
      if (cliente?.gestor_id) {
        setFormData(prev => ({
          ...prev,
          gestor_id: cliente.gestor_id
        }))
      }
    }
    cargar()
  }, [cliente?.gestor_id])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'monto_pagado' ? parseFloat(value) || 0 : value
    }))
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar
    const validacion = validarRegistroPagoRealizado(formData)
    if ('error' in validacion) {
      toast.error(validacion.error)
      return
    }

    // Registrar pago (los triggers hacen el resto automáticamente)
    const resultado = await registrarPagoRealizado(clienteId, formData)

    if (resultado) {
      // Los triggers ya actualizaron:
      // - clientes.total_pagado
      // - calendarios_pagos.saldo_pendiente
      // - calendarios_pagos.estado
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            Registrar Pago
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Información de la cuota */}
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Cuota:</span>
              <span className="font-semibold text-gray-900">{cuota.numero_cuota}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Prog:</span>
              <span className="font-semibold text-gray-900">${cuota.monto_programado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo:</span>
              <span className="font-semibold text-red-600">${cuota.saldo_pendiente.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-semibold text-gray-900 text-xs">
                {new Date(cuota.fecha_programada).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          {/* Fecha de Pago */}
          <div>
            <label htmlFor="fecha_pago" className="block text-xs font-medium text-gray-700 mb-1">
              Fecha de Pago *
            </label>
            <input
              type="date"
              id="fecha_pago"
              name="fecha_pago"
              value={formData.fecha_pago}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Monto Pagado */}
          <div>
            <label htmlFor="monto_pagado" className="block text-xs font-medium text-gray-700 mb-1">
              Monto Pagado * (Flexible)
            </label>
            <input
              type="number"
              id="monto_pagado"
              name="monto_pagado"
              value={formData.monto_pagado}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-0.5">
              Propuesta: ${cuota.saldo_pendiente.toFixed(2)}
            </p>
          </div>

          {/* Gestor */}
          <div>
            <label htmlFor="gestor_id" className="block text-xs font-medium text-gray-700 mb-1">
              Gestor que Cobra *
            </label>
            <select
              id="gestor_id"
              name="gestor_id"
              value={formData.gestor_id}
              onChange={handleChange}
              required
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar gestor --</option>
              {gestores.map(gestor => (
                <option key={gestor.id} value={gestor.id}>
                  {gestor.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notas" className="block text-xs font-medium text-gray-700 mb-1">
              Notas (Opcional)
            </label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows={2}
              maxLength={500}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Ej: Pago contado, cheque, etc."
            />
            <p className="text-xs text-gray-500 mt-0.5">
              {formData.notas?.length || 0}/500
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
