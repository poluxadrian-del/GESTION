import { AlertTriangle, Phone } from 'lucide-react'
import type { Pago } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'

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
        No hay cartera vencida
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
        {pagos.map(pago => {
          const diasAtraso = calcularDiasAtraso(pago.fecha_programada);
          return (
            <div
              key={pago.id}
              className="bg-red-50 border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {(pago.cliente as any)?.nombre_completo}
                    </h4>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                      {diasAtraso} días
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Cuota</p>
                      <p className="font-medium">{pago.numero_pago}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha Vencimiento</p>
                      <p className="font-medium">{formatDate(pago.fecha_programada)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Monto</p>
                      <p className="font-medium text-red-600">{formatCurrency(pago.monto_programado)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Teléfono</p>
                      <a
                        href={`https://wa.me/${(pago.cliente as any)?.telefono_celular?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Phone size={14} />
                        {(pago.cliente as any)?.telefono_celular}
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectPago(pago)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
                  >
                    Cobrar Ahora
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}
