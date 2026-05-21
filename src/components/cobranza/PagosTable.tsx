import { useState } from 'react'
import { Clock, ChevronDown, ChevronRight, Eye, Calendar, MessageSquare } from 'lucide-react'
import type { Pago } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface PagosTableProps {
  pagos: Pago[]
  loading: boolean
  onSelectPago: (pago: Pago) => void
  onSelectSeguimiento: (pago: Pago) => void
  onSelectCliente?: (clienteId: string) => void
  onSelectCalendario?: (clienteId: string) => void
  canRegister?: boolean
}

interface ClienteAgrupado {
  cliente_id: string
  nombre_completo: string
  telefono_celular?: string
  dia_pago?: number
  pagos: Pago[]
  total_pagos: number
  pagos_atrasados: number
  monto_total: number
}

export default function PagosTable({ 
  pagos, 
  loading, 
  onSelectPago, 
  onSelectSeguimiento,
  onSelectCliente,
  onSelectCalendario,
  canRegister = true,
}: PagosTableProps) {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (pagos.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay pagos pendientes
      </div>
    )
  }

  // Agrupar pagos por cliente
  const clientesAgrupados: ClienteAgrupado[] = Object.values(
    pagos.reduce((acc: Record<string, ClienteAgrupado>, pago) => {
      const clienteId = pago.cliente_id
      const clienteNombre = (pago.cliente as any)?.nombre_completo || 'N/A'
      const clienteCelular = (pago.cliente as any)?.telefono_celular || '-'
      const clienteDiaPago = (pago.cliente as any)?.dia_pago
      
      if (!acc[clienteId]) {
        acc[clienteId] = {
          cliente_id: clienteId,
          nombre_completo: clienteNombre,
          telefono_celular: clienteCelular,
          dia_pago: clienteDiaPago,
          pagos: [],
          total_pagos: 0,
          pagos_atrasados: 0,
          monto_total: 0,
        }
      }
      
      acc[clienteId].pagos.push(pago)
      acc[clienteId].total_pagos += 1
      if (pago.dias_atraso > 0) {
        acc[clienteId].pagos_atrasados += 1
      }
      acc[clienteId].monto_total += pago.monto_programado
      
      return acc
    }, {})
  ).sort((a, b) => {
    // Ordenar primero por día de pago (ascendente), luego por pagos atrasados (descendente)
    if ((a.dia_pago || 999) !== (b.dia_pago || 999)) {
      return (a.dia_pago || 999) - (b.dia_pago || 999)
    }
    if (b.pagos_atrasados !== a.pagos_atrasados) {
      return b.pagos_atrasados - a.pagos_atrasados
    }
    return a.nombre_completo.localeCompare(b.nombre_completo)
  })

  const toggleExpanded = (clienteId: string) => {
    const newExpanded = new Set(expandedClients)
    if (newExpanded.has(clienteId)) {
      newExpanded.delete(clienteId)
    } else {
      newExpanded.add(clienteId)
    }
    setExpandedClients(newExpanded)
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Tabla de resumen por cliente */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-900 w-10"></th>
              <th className="px-3 py-3 text-left font-semibold text-gray-900">Cliente</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-900">Celular</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-900">Día de Pago</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-900">Cuotas Pendientes</th>
              <th className="px-3 py-3 text-right font-semibold text-gray-900">Monto Total</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-900 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clientesAgrupados.map((clienteGrupado) => [
              // Fila de resumen del cliente
              <tr key={`header-${clienteGrupado.cliente_id}`} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toggleExpanded(clienteGrupado.cliente_id)}>
                <td className="px-3 py-3 text-center">
                  {clienteGrupado.pagos.length > 0 ? (
                    expandedClients.has(clienteGrupado.cliente_id) ? (
                      <ChevronDown size={16} className="text-gray-600" />
                    ) : (
                      <ChevronRight size={16} className="text-gray-600" />
                    )
                  ) : null}
                </td>
                <td className="px-3 py-3 font-semibold text-gray-900">
                  {clienteGrupado.nombre_completo}
                </td>
                <td className="px-3 py-3 text-gray-600">
                  {clienteGrupado.telefono_celular}
                </td>
                <td className="px-3 py-3 text-center font-semibold text-gray-900">
                  {clienteGrupado.dia_pago ? `${clienteGrupado.dia_pago}` : 'N/A'}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold text-xs">
                    {clienteGrupado.total_pagos}
                  </span>
                  {clienteGrupado.pagos_atrasados > 0 && (
                    <div className="text-xs mt-1">
                      <span className="inline-block bg-red-200 text-red-800 px-2 py-0.5 rounded font-semibold">
                        {clienteGrupado.pagos_atrasados} atraso
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">
                  {formatCurrency(clienteGrupado.monto_total)}
                </td>
                <td className="px-3 py-3 text-center flex items-center justify-center gap-2">
                  {onSelectCliente && (
                    <button
                      onClick={() => onSelectCliente(clienteGrupado.cliente_id)}
                      className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                      title="Ver detalles del cliente"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  {onSelectCalendario && (
                    <button
                      onClick={() => onSelectCalendario(clienteGrupado.cliente_id)}
                      className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                      title="Ver calendario de pagos"
                    >
                      <Calendar size={16} />
                    </button>
                  )}
                  {onSelectSeguimiento && clienteGrupado.pagos.length > 0 && (
                    <button
                      onClick={() => onSelectSeguimiento(clienteGrupado.pagos[0])}
                      className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-colors"
                      title="Registrar seguimiento"
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </td>
              </tr>,
              // Detalles de pagos (expandible)
              ...(expandedClients.has(clienteGrupado.cliente_id)
                ? clienteGrupado.pagos.map((pago) => (
                    <tr key={pago.id} className="bg-gray-50 hover:bg-gray-100">
                      <td colSpan={5}>
                        <div className="px-12 py-3 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-700">
                              Cuota {pago.numero_pago || 1}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Programada: {formatDate(pago.fecha_programada)}
                              {pago.dias_atraso > 0 && (
                                <span className="ml-2 inline-block bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                                  {pago.dias_atraso} día{pago.dias_atraso !== 1 ? 's' : ''} atraso
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-semibold text-gray-900 text-xs">
                                {formatCurrency(pago.monto_programado)}
                              </div>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                                <Clock size={10} />
                                Pendiente
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectPago(pago)
                              }}
                              disabled={!canRegister}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                canRegister
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              title={canRegister ? 'Registrar pago' : 'No tienes permisos para registrar pagos'}
                            >
                              Registrar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                : []),
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}
