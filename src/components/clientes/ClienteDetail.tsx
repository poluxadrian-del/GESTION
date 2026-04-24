import { Calendar, MapPin, Phone, Mail, History } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Cliente } from '@/types'
import { useClientes } from '@/hooks/useClientes'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface ClienteDetailProps {
  cliente: Cliente
  onShowHistorial?: () => void
}

export default function ClienteDetail({ cliente: initialCliente, onShowHistorial }: ClienteDetailProps) {
  const [cliente, setCliente] = useState<Cliente>(initialCliente)
  const { obtenerClientePorId, generarCalendarioPagosCliente, loading } = useClientes()

  useEffect(() => {
    const loadFreshData = async () => {
      try {
        const data = await obtenerClientePorId(initialCliente.id)
        if (data) setCliente(data)
      } catch (error) {
        console.error('Error loading client:', error)
      }
    }
    loadFreshData()
  }, [initialCliente.id, obtenerClientePorId])

  const handleGenerarCalendario = async () => {
    const success = await generarCalendarioPagosCliente(cliente.id)
    if (success) {
      // Recargar datos del cliente para actualizar estado
      const data = await obtenerClientePorId(cliente.id)
      if (data) setCliente(data)
    }
  }

  return (
    <div className="space-y-4">
      {/* Datos básicos */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-2">{cliente.nombre_completo}</h3>
        <p className="text-xs text-gray-500 mb-2">Contrato: {cliente.numero_contrato}</p>
      </div>

      {/* Estado y Saldo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Estado</p>
          <span className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-semibold ${
            cliente.estado === 'activo' ? 'bg-green-100 text-green-800' :
            cliente.estado === 'pausa' ? 'bg-yellow-100 text-yellow-800' :
            cliente.estado === 'liquidado' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {cliente.estado}
          </span>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Saldo</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {formatCurrency(cliente.saldo)}
          </p>
        </div>
      </div>

      {/* Contacto */}
      <div className="border-t pt-2 space-y-2">
        <h4 className="font-semibold text-sm text-gray-900">Contacto</h4>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          {cliente.telefono_celular && (
            <div className="flex items-start gap-2">
              <Phone size={16} className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Teléfono</p>
                <p className="text-xs font-medium text-gray-900 break-words">{cliente.telefono_celular}</p>
              </div>
            </div>
          )}

          {cliente.email && (
            <div className="flex items-start gap-2">
              <Mail size={16} className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Email</p>
                <p className="text-xs font-medium text-gray-900 break-words">{cliente.email}</p>
              </div>
            </div>
          )}

          {cliente.ubicacion && (
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-blue-600 mt-1 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-600">Ubicación</p>
                <p className="text-xs font-medium text-gray-900 break-words">{cliente.ubicacion}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empresa */}
      {(cliente.empresa || cliente.telefono_empresa) && (
        <div className="border-t pt-2 space-y-2">
          <h4 className="font-semibold text-sm text-gray-900">Empresa</h4>

          <div className="space-y-2 text-sm">
            {cliente.empresa && (
              <div>
                <p className="text-xs text-gray-600">Nombre</p>
                <p className="font-medium text-gray-900">{cliente.empresa}</p>
              </div>
            )}
            {cliente.telefono_empresa && (
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600">Teléfono</p>
                  <p className="font-medium text-gray-900">{cliente.telefono_empresa}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Datos del Contrato */}
      <div className="border-t pt-2 space-y-2">
        <h4 className="font-semibold text-sm text-gray-900">Datos del Contrato</h4>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-xs text-gray-600">Precio Venta</p>
            <p className="font-medium text-gray-900">{formatCurrency(cliente.precio_venta)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Descuento</p>
            <p className="font-medium text-gray-900">{formatCurrency(cliente.descuento)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Pagado</p>
            <p className="font-medium text-green-600">{formatCurrency(cliente.total_pagado)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Saldo Restante</p>
            <p className="font-medium text-red-600">{formatCurrency(cliente.saldo)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Monto Pago</p>
            <p className="font-medium text-gray-900">{formatCurrency(cliente.monto_pago)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Día Pago</p>
            <p className="font-medium text-gray-900">Día {cliente.dia_pago}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Mensualidades</p>
            <p className="font-medium text-gray-900">{cliente.mensualidades}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Pagadas</p>
            <p className="font-medium text-green-600">{cliente.monto_pago ? Math.floor(cliente.total_pagado / cliente.monto_pago) : 0}</p>
          </div>
        </div>
      </div>

      {/* Información Administrativa */}
      <div className="border-t pt-2 space-y-2">
        <h4 className="font-semibold text-sm text-gray-900">Información Administrativa</h4>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-xs text-gray-600">Gestor Asignado</p>
            <p className="font-medium text-gray-900">{cliente.gestor?.nombre || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Vendedor</p>
            <p className="font-medium text-gray-900">{cliente.vendedor || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Factura</p>
            <p className={`font-medium ${cliente.factura ? 'text-green-600' : 'text-red-600'}`}>
              {cliente.factura ? 'Sí' : 'No'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Ref. Nombre</p>
            <p className="font-medium text-gray-900">{cliente.ref_nombre || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Ref. Teléfono</p>
            <p className="font-medium text-gray-900">{cliente.ref_telefono || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Botón para generar calendario (solo si está en estado 'inicio') */}
      {cliente.estado === 'inicio' && (
        <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">El cliente aún no tiene calendario de pagos. Genera uno ahora:</p>
          <button
            onClick={handleGenerarCalendario}
            disabled={loading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 text-sm font-medium transition-colors"
          >
            {loading ? 'Generando calendario...' : 'Generar Calendario de Pagos'}
          </button>
        </div>
      )}

      {/* Botón para ver historial de seguimientos */}
      {onShowHistorial && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
          <button
            onClick={onShowHistorial}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <History size={16} />
            Ver Historial de Seguimientos
          </button>
        </div>
      )}

      {/* Fecha inicio */}
      {cliente.fecha_inicio && (
        <div className="border-t pt-2 space-y-2">
          <div className="flex items-start gap-3">
            <Calendar size={16} className="text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600">Fecha Inicio</p>
              <p className="font-medium text-xs text-gray-900">{formatDate(cliente.fecha_inicio)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notas */}
      {cliente.notas && (
        <div className="border-t pt-2">
          <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Notas</p>
          <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">{cliente.notas}</p>
        </div>
      )}
    </div>
  )
}
