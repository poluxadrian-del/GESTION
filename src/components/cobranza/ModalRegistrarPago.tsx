import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registrarPagoSchema, editarPagoSchema, type RegistrarPagoInput, type EditarPagoInput } from '@/validations/pago'
import { usePagos } from '@/hooks/usePagos'
import { useGestores } from '@/hooks/useGestores'
import type { Pago, Gestor, Cliente } from '@/types'
import { formatCurrency } from '@/utils/formatters'

interface ModalRegistrarPagoProps {
  pago: Pago
  cliente?: Cliente
  onClose: () => void
  onSuccess: () => void
}

export default function ModalRegistrarPago({
  pago,
  cliente,
  onClose,
  onSuccess,
}: ModalRegistrarPagoProps) {
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [gestoresLoading, setGestoresLoading] = useState(false)
  const { registrarPago, editarPago } = usePagos()
  const { obtenerGestores } = useGestores()
  
  // Detectar si es edición o registro
  const esEdicion = pago.estado === 'pagado'
  const schema = esEdicion ? editarPagoSchema : registrarPagoSchema

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarPagoInput | EditarPagoInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      monto_pagado: pago.monto_pagado || pago.monto_programado,
      fecha_pago: pago.fecha_pago || new Date().toISOString().split('T')[0],
      gestor_id: pago.gestor_id || cliente?.gestor_id || '',
      notas: pago.notas || '',
      motivo_cambio: '',
    },
  })

  useEffect(() => {
    const loadGestores = async () => {
      setGestoresLoading(true)
      const data = await obtenerGestores(true)
      setGestores(data)
      // Después de cargar gestores, actualiza el gestor_id si es necesario
      const gestorId = pago.gestor_id || cliente?.gestor_id
      if (gestorId) {
        setValue('gestor_id', gestorId)
      }
      setGestoresLoading(false)
    }
    loadGestores()
  }, [obtenerGestores, pago.gestor_id, cliente?.gestor_id, setValue])

  // Actualizar gestor_id cuando pago o cliente cambie
  useEffect(() => {
    const gestorId = pago.gestor_id || cliente?.gestor_id
    if (gestorId) {
      setValue('gestor_id', gestorId)
    }
  }, [pago.gestor_id, cliente?.gestor_id, setValue])

  const onSubmit = async (data: RegistrarPagoInput | EditarPagoInput) => {
    let success = false
    if (esEdicion) {
      success = await editarPago(pago.id, pago.cliente_id, data as EditarPagoInput)
    } else {
      success = await registrarPago(pago.id, pago.cliente_id, data as RegistrarPagoInput)
    }
    if (success) {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-base font-bold text-gray-900">
            {esEdicion ? 'Editar Pago' : 'Registrar Pago'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-2">
          {/* Info Cliente */}
          <div className="bg-blue-50 p-2 rounded-lg">
            <p className="text-xs text-gray-600">Cliente</p>
            <p className="font-semibold text-sm text-gray-900">
              {(pago.cliente as any)?.nombre_completo}
            </p>
            <p className="text-xs text-gray-600 mt-1">Cuota {pago.numero_pago}</p>
            <p className="font-medium text-sm text-blue-600 mt-0.5">
              {formatCurrency(pago.monto_programado)}
            </p>
          </div>

          {/* Monto Pagado */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Monto Pagado *
            </label>
            <input
              {...register('monto_pagado', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.monto_pagado && (
              <p className="mt-0.5 text-xs text-red-600">{errors.monto_pagado.message}</p>
            )}
          </div>

          {/* Fecha Pago */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Fecha Pago *
            </label>
            <input
              {...register('fecha_pago')}
              type="date"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.fecha_pago && (
              <p className="mt-0.5 text-xs text-red-600">{errors.fecha_pago.message}</p>
            )}
          </div>

          {/* Gestor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Gestor *
            </label>
            <select
              {...register('gestor_id')}
              disabled={gestoresLoading}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar gestor...</option>
              {gestores.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            {errors.gestor_id && (
              <p className="mt-0.5 text-xs text-red-600">{errors.gestor_id.message}</p>
            )}
          </div>

          {/* Motivo de Cambio - Solo si es edición */}
          {esEdicion && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Motivo del Cambio *
              </label>
              <textarea
                {...register('motivo_cambio')}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Explicar por qué se realiza este cambio..."
              />
              {errors.motivo_cambio && (
                <p className="mt-0.5 text-xs text-red-600">{errors.motivo_cambio.message}</p>
              )}
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Notas
            </label>
            <textarea
              {...register('notas')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Comentarios adicionales..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isSubmitting ? (esEdicion ? 'Actualizando...' : 'Registrando...') : (esEdicion ? 'Actualizar' : 'Registrar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
