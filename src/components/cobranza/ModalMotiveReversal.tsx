import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface ModalMotiveReversalProps {
  isOpen: boolean
  pagoFecha: string
  pagoMonto: number
  onConfirm: (motivo: string) => Promise<void>
  onClose: () => void
  loading?: boolean
}

export default function ModalMotiveReversal({
  isOpen,
  pagoFecha,
  pagoMonto,
  onConfirm,
  onClose,
  loading = false
}: ModalMotiveReversalProps) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!motivo.trim()) {
      setError('El motivo es requerido')
      return
    }

    try {
      await onConfirm(motivo)
      setMotivo('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reversar el pago')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reversar Pago</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Warning */}
          <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-800">
              <p className="font-semibold">Reversando pago:</p>
              <p className="mt-1">Fecha: {pagoFecha}</p>
              <p>Monto: ${pagoMonto.toFixed(2)}</p>
            </div>
          </div>

          {/* Motivo Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Motivo de Reversión *
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={loading}
              placeholder="Ej: Pago duplicado, error en monto, solicitud del cliente..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 resize-none disabled:bg-gray-100"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {motivo.length}/500 caracteres
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !motivo.trim()}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? 'Reversando...' : 'Reversar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
