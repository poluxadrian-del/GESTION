import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { Pago } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useState } from 'react'

interface CarteraVencidaProps {
  pagos: Pago[]
  loading: boolean
  onSelectPago: (pago: Pago) => void
}

const calcularDiasAtraso = (fechaProgramada: string): number => {
  const today = new Date();
  const fecha = new Date(fechaProgramada);
  const diffTime = today.getTime() - fecha.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function CarteraVencida({ pagos, loading, onSelectPago }: CarteraVencidaProps) {
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set())

  const toggleExpanded = (clienteId: string) => {
    const newExpanded = new Set(expandedClientes)
    if (newExpanded.has(clienteId)) {
      newExpanded.delete(clienteId)
    } else {
      newExpanded.add(clienteId)
    }
    setExpandedClientes(newExpanded)
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (pagos.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No hay cartera vencida (más de 30 días)
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
        <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-red-900">Cartera Vencida (+ de 30 días)</h3>
          <p className="text-sm text-red-700 mt-1">Clientes con pagos vencidos que requieren seguimiento urgente</p>
        </div>
      </div>

      <div className="space-y-3">
        {pagos.map((item: any) => {
          const diasAtraso = calcularDiasAtraso(item.fecha_programada);
          const isExpanded = expandedClientes.has(item.cliente_id);
          
          return (
            <div
              key={item.cliente_id}
              className="bg-red-50 border border-red-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cliente Summary */}
              <div
                onClick={() => toggleExpanded(item.cliente_id)}
                className="p-4 cursor-pointer hover:bg-red-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm text-gray-900">
                        {item.clientes?.nombre_completo || 'N/A'}
                      </h4>
                      <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded">
                        {diasAtraso} días
                      </span>
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        {item.totalCuotas} cuota{item.totalCuotas !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                      <div>
                        <p className="text-gray-600">Total Vencido</p>
                        <p className="font-bold text-red-600 text-sm">{formatCurrency(item.totalVencido)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Contrato</p>
                        <p className="font-medium text-sm">{item.clientes?.numero_contrato || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Gestor</p>
                        <p className="font-medium text-sm">{item.clientes?.gestor?.nombre || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fecha más antigua</p>
                        <p className="font-medium text-sm">{formatDate(item.fecha_programada)}</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Seleccionar la cuota más vencida para cobrar
                        const cuotaMasVencida = item.cuotasVencidas.reduce((prev: any, curr: any) => 
                          new Date(curr.fecha_programada) < new Date(prev.fecha_programada) ? curr : prev
                        );
                        onSelectPago(cuotaMasVencida)
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                    >
                      Cobrar Ahora
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleExpanded(item.cliente_id)
                    }}
                    className="text-gray-600 hover:text-gray-900 flex-shrink-0 mt-1"
                  >
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Cuotas Details */}
              {isExpanded && (
                <div className="border-t border-red-200 bg-red-100 p-4 space-y-2">
                  {item.cuotasVencidas.map((cuota: any) => {
                    const diasAtrasoDetalle = calcularDiasAtraso(cuota.fecha_programada);
                    return (
                      <div
                        key={cuota.id}
                        className="bg-white rounded p-3 text-xs flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex gap-3 mb-1">
                            <span className="font-semibold">Cuota {cuota.numero_cuota}</span>
                            <span className="text-red-600 font-bold">{diasAtrasoDetalle} días</span>
                          </div>
                          <div className="flex gap-4 text-gray-600">
                            <span>Fecha: {formatDate(cuota.fecha_programada)}</span>
                            <span>Monto: {formatCurrency(cuota.saldo_pendiente || cuota.monto_programado)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectPago(cuota)}
                          className="ml-3 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium flex-shrink-0 whitespace-nowrap"
                        >
                          Cobrar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}
