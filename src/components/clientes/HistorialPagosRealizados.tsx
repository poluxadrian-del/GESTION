import { useEffect, useState } from 'react'
import { usePagos } from '@/hooks/usePagos'
import type { PagoRealizado } from '@/types'
import { formatDate } from '@/utils/formatters'
import { Calendar, DollarSign, Trash2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ModalMotiveReversal from '../cobranza/ModalMotiveReversal'

interface HistorialPagosRealizadosProps {
  clienteId: string
  refreshTrigger?: number
  onPagoChanged?: () => void
  onEdit?: (pago: PagoRealizado) => void
  onDelete?: (pago: PagoRealizado) => void
}

export default function HistorialPagosRealizados({
  clienteId,
  refreshTrigger = 0,
  onPagoChanged,
  onDelete
}: HistorialPagosRealizadosProps) {
  const { obtenerPagosRealizados, loading, reversarPagoRealizado } = usePagos()

  const [pagosRealizados, setPagosRealizados] = useState<PagoRealizado[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPago, setSelectedPago] = useState<PagoRealizado | null>(null)
  const [reversalLoading, setReversalLoading] = useState(false)

  useEffect(() => {
    cargarPagos()
  }, [clienteId, refreshTrigger])

  const cargarPagos = async () => {
    const pagos = await obtenerPagosRealizados(clienteId)
    setPagosRealizados(pagos)
  }

  const handleOpenReversalModal = (pago: PagoRealizado) => {
    setSelectedPago(pago)
    setModalOpen(true)
  }

  const handleConfirmReversal = async (motivo: string) => {
    if (!selectedPago) return

    setReversalLoading(true)
    try {
      const resultado = await reversarPagoRealizado(selectedPago.id, motivo)
      
      if (resultado) {
        setModalOpen(false)
        setSelectedPago(null)
        toast.success('Pago reversado exitosamente')
        cargarPagos()
        onPagoChanged?.()
        onDelete?.(selectedPago)
      }
    } finally {
      setReversalLoading(false)
    }
  }

  if (loading && pagosRealizados.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 text-xs mt-1">Cargando pagos...</p>
      </div>
    )
  }

  if (pagosRealizados.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-xs">
        <DollarSign size={16} className="mx-auto mb-1 text-gray-400" />
        <p>Sin pagos registrados</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
          <Calendar size={16} />
          Histórico de Pagos ({pagosRealizados.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Fecha</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700">Monto</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Gestor</th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">Notas</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-700">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagosRealizados.map((pago) => {
                const esReversado = pago.monto_pagado === 0 && pago.motivo_eliminacion
                
                return (
                  <tr 
                    key={pago.id} 
                    className={`transition-colors ${
                      esReversado 
                        ? 'bg-red-50 hover:bg-red-100' 
                        : 'hover:bg-gray-50'
                    }`}
                    title={esReversado ? `Reversado: ${pago.motivo_eliminacion}` : ''}
                  >
                    <td className="px-2 py-2 text-gray-900 whitespace-nowrap">
                      {formatDate(pago.fecha_pago)}
                    </td>
                    <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${
                      esReversado 
                        ? 'text-red-600 line-through' 
                        : 'text-green-600'
                    }`}>
                      ${pago.monto_pagado.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {pago.gestor?.nombre || 'N/A'}
                    </td>
                    <td className="px-2 py-2 text-gray-600 max-w-xs truncate">
                      {esReversado ? (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle size={12} />
                          Reversado
                        </span>
                      ) : (
                        pago.notas || '-'
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!esReversado && (
                        <button
                          onClick={() => handleOpenReversalModal(pago)}
                          disabled={reversalLoading}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Reversar pago"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de motivo de reversión */}
      {selectedPago && (
        <ModalMotiveReversal
          isOpen={modalOpen}
          pagoFecha={formatDate(selectedPago.fecha_pago)}
          pagoMonto={selectedPago.monto_pagado}
          onConfirm={handleConfirmReversal}
          onClose={() => {
            setModalOpen(false)
            setSelectedPago(null)
          }}
          loading={reversalLoading}
        />
      )}
    </>
  )
}
