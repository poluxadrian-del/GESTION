import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useGestores } from '@/hooks/useGestores'
import type { Cliente, Gestor } from '@/types'
import { formatCurrency } from '@/utils/formatters'

interface ClienteFormProps {
  cliente?: Cliente | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  loading: boolean
  onGenerarCalendario?: () => Promise<void>
  generandoCalendario?: boolean
}

export default function ClienteForm({
  cliente,
  onSubmit,
  onCancel,
  loading,
  onGenerarCalendario,
  generandoCalendario,
}: ClienteFormProps) {
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [diaPago2, setDiaPago2] = useState<number | ''>(cliente?.dia_pago || '')
  const { obtenerGestores, loading: gestoresLoading } = useGestores()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setValue,
  } = useForm<any>({
    defaultValues: cliente ? {
      nombre_completo: cliente.nombre_completo,
      telefono_celular: cliente.telefono_celular || '',
      email: cliente.email || '',
      ubicacion: cliente.ubicacion,
      empresa: cliente.empresa || '',
      telefono_empresa: cliente.telefono_empresa || '',
      ref_nombre: cliente.ref_nombre || '',
      ref_telefono: cliente.ref_telefono || '',
      gestor_id: cliente.gestor_id,
      fecha_inicio: cliente.fecha_inicio,
      precio_venta: cliente.precio_venta,
      descuento: cliente.descuento,
      estado: cliente.estado,
      frecuencia_pago: cliente.frecuencia_pago,
      mensualidades: cliente.mensualidades,
      dia_pago: cliente.dia_pago,
      fecha_primer_pago: cliente.fecha_primer_pago || '',
      vendedor: cliente.vendedor || '',
      factura: cliente.factura,
      comision: false,
      notas: cliente.notas || '',
      monto_pago: cliente.monto_pago || 0,
    } : undefined,
  })

  // Watch valores para resumen
  const precioVenta = useWatch({ control, name: 'precio_venta', defaultValue: cliente?.precio_venta || 0 })
  const mensualidades = useWatch({ control, name: 'mensualidades', defaultValue: cliente?.mensualidades || 0 })
  const frecuenciaPago = useWatch({ control, name: 'frecuencia_pago', defaultValue: cliente?.frecuencia_pago || 'mensual' })

  // Calcular número de cuotas
  const numeroCuotas = frecuenciaPago === 'quincenal' ? mensualidades * 2 : mensualidades
  // Monto por cuota individual
  const montoPorCuota = numeroCuotas > 0 ? precioVenta / numeroCuotas : 0
  // Monto mensual (lo que se guardará en BD)
  const montoPagoMensual = mensualidades > 0 ? precioVenta / mensualidades : 0

  useEffect(() => {
    const loadGestores = async () => {
      const data = await obtenerGestores()
      setGestores(data)
      // Después de cargar gestores, actualiza el gestor_id si existe cliente
      if (cliente?.gestor_id) {
        setValue('gestor_id', cliente.gestor_id)
      }
    }
    loadGestores()
  }, [obtenerGestores, cliente?.gestor_id, setValue])

  // Actualizar formulario cuando cambia el cliente editado
  useEffect(() => {
    if (cliente) {
      reset({
        nombre_completo: cliente.nombre_completo,
        telefono_celular: cliente.telefono_celular || '',
        email: cliente.email || '',
        ubicacion: cliente.ubicacion,
        empresa: cliente.empresa || '',
        telefono_empresa: cliente.telefono_empresa || '',
        ref_nombre: cliente.ref_nombre || '',
        ref_telefono: cliente.ref_telefono || '',
        gestor_id: cliente.gestor_id,
        fecha_inicio: cliente.fecha_inicio,
        precio_venta: cliente.precio_venta,
        descuento: cliente.descuento,
        estado: cliente.estado,
        frecuencia_pago: cliente.frecuencia_pago,
        mensualidades: cliente.mensualidades,
        dia_pago: cliente.dia_pago,
        fecha_primer_pago: cliente.fecha_primer_pago || '',
        vendedor: cliente.vendedor || '',
        factura: cliente.factura,
        comision: false,
        notas: cliente.notas || '',
        monto_pago: cliente.monto_pago || 0,
      })
      // Después de hacer reset, asegurar que gestor_id tenga el valor correcto
      setValue('gestor_id', cliente.gestor_id)
    }
  }, [cliente, reset, setValue])

  const onSubmitForm = async (data: any) => {
    try {
      console.log('Form submit - datos brutos:', data)
      
      // Recalcular monto_pago basado en los datos del formulario actual
      // Para quincenales: dividir entre (mensualidades * 2)
      // Para mensuales: dividir entre mensualidades
      const numeroCuotasTotal = data.frecuencia_pago === 'quincenal' ? data.mensualidades * 2 : data.mensualidades
      const montoPagoCalculado = numeroCuotasTotal > 0 ? data.precio_venta / numeroCuotasTotal : 0
      
      // Normalizar datos: convertir strings vacíos a null
      const normalizedData: any = {
        ...data,
        email: data.email || null,
        telefono_celular: data.telefono_celular || null,
        empresa: data.empresa || null,
        telefono_empresa: data.telefono_empresa || null,
        ref_nombre: data.ref_nombre || null,
        ref_telefono: data.ref_telefono || null,
        fecha_primer_pago: data.fecha_primer_pago || null,
        vendedor: data.vendedor || null,
        notas: data.notas || null,
        gestor_id: data.gestor_id && data.gestor_id.trim() ? data.gestor_id : null,
        monto_pago: montoPagoCalculado,
      };
      
      // Agregar dia_pago_2 solo en memoria para la generación del calendario (desde estado local)
      // Este campo NO se guardará en BD, solo se usa para generar el calendario
      if (data.frecuencia_pago === 'quincenal' && diaPago2) {
        normalizedData._diaPago2Temporal = diaPago2;
      }
      
      console.log('Form submit - datos normalizados:', normalizedData)
      await onSubmit(normalizedData)
      console.log('Form submit completado')
      
      reset()
    } catch (error) {
      console.error('Error en formulario:', error)
    }
  }

  const handleGenerarCalendarioClick = () => {
    handleSubmit(async (data) => {
      try {
        console.log('GenerarCalendario - datos brutos:', data)
        
        // Recalcular monto_pago basado en los datos del formulario actual
        // Para quincenales: dividir entre (mensualidades * 2)
        // Para mensuales: dividir entre mensualidades
        const numeroCuotasTotal = data.frecuencia_pago === 'quincenal' ? data.mensualidades * 2 : data.mensualidades
        const montoPagoCalculado = numeroCuotasTotal > 0 ? data.precio_venta / numeroCuotasTotal : 0
        
        // Normalizar datos: convertir strings vacíos a null
        const normalizedData: any = {
          ...data,
          email: data.email || null,
          telefono_celular: data.telefono_celular || null,
          empresa: data.empresa || null,
          telefono_empresa: data.telefono_empresa || null,
          ref_nombre: data.ref_nombre || null,
          ref_telefono: data.ref_telefono || null,
          fecha_primer_pago: data.fecha_primer_pago || null,
          vendedor: data.vendedor || null,
          notas: data.notas || null,
          gestor_id: data.gestor_id && data.gestor_id.trim() ? data.gestor_id : null,
          monto_pago: montoPagoCalculado,
        };
        
        if (data.frecuencia_pago === 'quincenal' && diaPago2) {
          normalizedData._diaPago2Temporal = diaPago2;
        }
        
        console.log('GenerarCalendario - datos normalizados:', normalizedData)
        await onSubmit(normalizedData)
        console.log('GenerarCalendario - Cambios guardados, ahora generando calendario...')
        
        // Generar calendario después de guardar
        if (onGenerarCalendario) {
          await onGenerarCalendario()
          console.log('GenerarCalendario - Calendario generado exitosamente')
        }
        
        reset()
      } catch (error) {
        console.error('Error en GenerarCalendario:', error)
      }
    })()
  }

  const renderFieldError = (fieldName: string) => {
    const error = errors[fieldName]
    if (error) {
      const message = typeof error.message === 'string' ? error.message : 'Error en este campo'
      return <span className="text-red-600 text-xs mt-1">{message}</span>
    }
    return null
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
        {/* Resumen Compacto - Siempre visible */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-600 font-medium">Precio Venta</p>
              <p className="text-xs font-bold text-gray-900">{formatCurrency(precioVenta || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Cuotas</p>
              <p className="text-xs font-bold text-gray-900">{numeroCuotas}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Monto/Cuota</p>
              <p className="text-xs font-bold text-blue-600">{formatCurrency(montoPorCuota)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Monto Mensual</p>
              <p className="text-xs font-bold text-green-600">{formatCurrency(montoPagoMensual)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo *</label>
            <input {...register('nombre_completo')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Juan Pérez" />
            {renderFieldError('nombre_completo')}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gestor *</label>
            <select {...register('gestor_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" disabled={gestoresLoading}>
              {!cliente && <option value="">Seleccionar gestor...</option>}
              {gestores.map(g => (<option key={g.id} value={g.id}>{g.nombre}</option>))}
            </select>
            {renderFieldError('gestor_id')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input {...register('email')} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="correo@example.com" />
            {renderFieldError('email')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
            <input {...register('telefono_celular')} type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="+57 3001234567" />
            {renderFieldError('telefono_celular')}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Ubicación *</label>
          <input {...register('ubicacion')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Calle 123 #45-67, Medellín" />
          {renderFieldError('ubicacion')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Empresa</label>
            <input {...register('empresa')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Nombre de la empresa" />
            {renderFieldError('empresa')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono Empresa</label>
            <input {...register('telefono_empresa')} type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="+57 1 2345678" />
            {renderFieldError('telefono_empresa')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Referencia</label>
            <input {...register('ref_nombre')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Nombre de referencia" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono Referencia</label>
            <input {...register('ref_telefono')} type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="+57 3001234567" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Precio Venta *</label>
            <input {...register('precio_venta', { valueAsNumber: true })} type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="1000000" />
            {renderFieldError('precio_venta')}
          </div>
          {cliente && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descuento</label>
              <input {...register('descuento', { valueAsNumber: true })} type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="0" />
              {renderFieldError('descuento')}
            </div>
          )}
        </div>

        {cliente && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado *</label>
              <select {...register('estado')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                <option value="inicio">Inicio</option>
                <option value="activo">Activo</option>
                <option value="pausa">Pausa</option>
                <option value="liquidado">Liquidado</option>
              </select>
              {renderFieldError('estado')}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Inicio *</label>
            <input {...register('fecha_inicio')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            {renderFieldError('fecha_inicio')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Primer Pago (opcional)</label>
            <input {...register('fecha_primer_pago')} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            <p className="text-xs text-gray-500 mt-1">Si no se completa, usará la fecha de inicio</p>
            {renderFieldError('fecha_primer_pago')}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Frecuencia *</label>
            <select {...register('frecuencia_pago')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
            </select>
            {renderFieldError('frecuencia_pago')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mensualidades *</label>
            <input {...register('mensualidades', { valueAsNumber: true })} type="number" min="2" max="18" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="12" />
            {renderFieldError('mensualidades')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {frecuenciaPago === 'quincenal' ? 'Día 1ª Quincena *' : 'Día Pago *'}
            </label>
            <input {...register('dia_pago', { valueAsNumber: true })} type="number" min="1" max="31" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="1" />
            {renderFieldError('dia_pago')}
          </div>
        </div>

        {frecuenciaPago === 'quincenal' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Día 2ª Quincena *</label>
            <input 
              type="number" 
              min="1" 
              max="31" 
              value={diaPago2}
              onChange={(e) => setDiaPago2(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" 
              placeholder="16" 
            />
            <p className="text-xs text-gray-500 mt-1">Día de la segunda quincena del mes (ej: 16 si la 1ª es día 1)</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Vendedor</label>
          <input {...register('vendedor')} type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="Nombre del vendedor" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('factura')} type="checkbox" className="w-4 h-4" />
            <span className="text-xs text-gray-700">Requiere Factura</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
          <textarea {...register('notas')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" rows={2} placeholder="Observaciones adicionales..." />
        </div>

        {/* Botón para generar calendario (solo si está en estado 'inicio') */}
        {cliente && cliente.estado === 'inicio' && onGenerarCalendario && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-2">Después de corroborar los datos, genera el calendario de pagos:</p>
            <button
              type="button"
              onClick={handleGenerarCalendarioClick}
              disabled={generandoCalendario || isSubmitting || loading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium transition-colors"
            >
              {generandoCalendario || isSubmitting ? 'Generando calendario...' : 'Generar Calendario de Pagos'}
            </button>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
          <button type="button" onClick={onCancel} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
          <button type="submit" disabled={isSubmitting || loading} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm">
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    )
  }
  