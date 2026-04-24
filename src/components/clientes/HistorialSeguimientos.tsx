import { useEffect, useState } from 'react'
import { X, Calendar, MessageSquare, User } from 'lucide-react'
import { useSeguimientos } from '@/hooks/useSeguimientos'
import type { Seguimiento } from '@/types'
import { formatDate } from '@/utils/formatters'

interface HistorialSeguimientosProps {
  clienteId: string
  clienteNombre: string
  onClose: () => void
}

export default function HistorialSeguimientos({
  clienteId,
  clienteNombre,
  onClose,
}: HistorialSeguimientosProps) {
  const { obtenerSeguimientosPorCliente, loading } = useSeguimientos()
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])

  useEffect(() => {
    const loadSeguimientos = async () => {
      const data = await obtenerSeguimientosPorCliente(clienteId)
      setSeguimientos(data)
    }
    loadSeguimientos()
  }, [clienteId, obtenerSeguimientosPorCliente])

  const getTipoContactoBadge = (tipo: string) => {
    const tipos: Record<string, { bg: string; text: string; icon: string }> = {
      llamada: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '☎️' },
      whatsapp: { bg: 'bg-green-100', text: 'text-green-800', icon: '💬' },
      email: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '📧' },
    }
    return tipos[tipo] || tipos.llamada
  }

  const getResultadoBadge = (resultado: string) => {
    const resultados: Record<string, { bg: string; text: string }> = {
      contactado: { bg: 'bg-green-100', text: 'text-green-800' },
      no_contesto: { bg: 'bg-orange-100', text: 'text-orange-800' },
      promesa_pago: { bg: 'bg-blue-100', text: 'text-blue-800' },
      numero_incorrecto: { bg: 'bg-red-100', text: 'text-red-800' },
    }
    return resultados[resultado] || resultados.no_contesto
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Historial de Seguimientos</h2>
            <p className="text-blue-100 text-sm">{clienteNombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : seguimientos.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No hay seguimientos registrados para este cliente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {seguimientos.map((seg) => {
                const tipoBadge = getTipoContactoBadge(seg.tipo_contacto)
                const resultadoBadge = getResultadoBadge(seg.resultado)

                return (
                  <div
                    key={seg.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    {/* Row 1: Tipo y Resultado */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${tipoBadge.bg} ${tipoBadge.text}`}>
                          {tipoBadge.icon} {seg.tipo_contacto}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${resultadoBadge.bg} ${resultadoBadge.text}`}>
                          {seg.resultado.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Fecha y Usuario */}
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(seg.fecha_contacto)}
                        </span>
                        {seg.usuario && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {seg.usuario.nombre_completo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Notas */}
                    {seg.notas && (
                      <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-400">
                        <p className="text-xs text-gray-600 font-medium mb-1">Notas:</p>
                        <p className="text-sm text-gray-800">{seg.notas}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <p className="text-xs text-gray-600 text-center">
            Total de seguimientos: <span className="font-bold text-gray-900">{seguimientos.length}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
