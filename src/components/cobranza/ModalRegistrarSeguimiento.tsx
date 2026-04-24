import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { seguimientoFormSchema, type SeguimientoFormInput } from '@/validations/seguimiento'
import { useSeguimientos } from '@/hooks/useSeguimientos'
import { useAuthStore } from '@/store/authStore'
import type { Pago, Seguimiento } from '@/types'

interface ModalRegistrarSeguimientoProps {
  pago: Pago
  onClose: () => void
  onSuccess: () => void
}

export default function ModalRegistrarSeguimiento({
  pago,
  onClose,
  onSuccess,
}: ModalRegistrarSeguimientoProps) {
  const { usuario } = useAuthStore()
  const { crearSeguimiento } = useSeguimientos()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SeguimientoFormInput>({
    resolver: zodResolver(seguimientoFormSchema),
    defaultValues: {
      tipo_contacto: 'llamada',
      resultado: 'contactado',
      notas: '',
    },
  })

  const onSubmit = async (data: SeguimientoFormInput) => {
    if (!usuario) return

    const resultado = await crearSeguimiento(pago.cliente_id, usuario.id, data)
    if (resultado) {
      onSuccess()
    }
  }

  const clienteNombre = (pago.cliente as any)?.nombre_completo || 'Cliente'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Registrar Seguimiento</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Cliente:</span> {clienteNombre}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Cuota:</span> {pago.numero_pago}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de Contacto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Contacto *
            </label>
            <select
              {...register('tipo_contacto')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="llamada">Llamada Telefónica</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
            {errors.tipo_contacto && (
              <p className="text-red-600 text-sm mt-1">{errors.tipo_contacto.message}</p>
            )}
          </div>

          {/* Resultado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resultado *
            </label>
            <select
              {...register('resultado')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="contactado">Contactado</option>
              <option value="no_contesto">No Contestó</option>
              <option value="promesa_pago">Promesa de Pago</option>
              <option value="numero_incorrecto">Número Incorrecto</option>
            </select>
            {errors.resultado && (
              <p className="text-red-600 text-sm mt-1">{errors.resultado.message}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              {...register('notas')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Agrega notas adicionales del seguimiento..."
            />
            {errors.notas && (
              <p className="text-red-600 text-sm mt-1">{errors.notas.message}</p>
            )}
          </div>

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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Registrar Seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
