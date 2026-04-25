import { useEffect, useState, useRef } from 'react'
import { usePagos } from '@/hooks/usePagos'
import { useGestores } from '@/hooks/useGestores'
import { useClientes } from '@/hooks/useClientes'
import { useAuthStore } from '@/store/authStore'
import type { Pago, Cliente } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { Calendar, CheckCircle, Clock, AlertCircle, Edit2, Plus, Download, RefreshCw } from 'lucide-react'
import ModalRegistrarPago from '@/components/cobranza/ModalRegistrarPago'
import ModalReestructurarCalendario from '@/components/clientes/ModalReestructurarCalendario'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'

interface CalendarioPagosProps {
  clienteId: string
  cliente?: Cliente
}

export default function CalendarioPagos({ clienteId, cliente }: CalendarioPagosProps) {
  const { obtenerPagosPorCliente, loading } = usePagos()
  const { obtenerGestor } = useGestores()
  const { obtenerClientePorId } = useClientes()
  const { usuario } = useAuthStore()
  const [pagos, setPagos] = useState<Pago[]>([])
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showModalReestructurar, setShowModalReestructurar] = useState(false)
  const [gestorNombre, setGestorNombre] = useState<string>('')
  const [clienteActualizado, setClienteActualizado] = useState<Cliente | undefined>(cliente)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const calendarioRef = useRef<HTMLDivElement>(null)

  // Permisos
  const canRegisterPayments = usuario?.rol !== 'supervisor'
  const canReestructurar = usuario?.rol !== 'supervisor'

  const loadPagos = async () => {
    const data = await obtenerPagosPorCliente(clienteId)
    setPagos(data)
  }

  // Cargar cliente actualizado desde BD para obtener meses_pagados correcto
  useEffect(() => {
    const loadClienteActualizado = async () => {
      const data = await obtenerClientePorId(clienteId)
      if (data) {
        setClienteActualizado(data)
      }
    }
    loadClienteActualizado()
  }, [clienteId, obtenerClientePorId])

  useEffect(() => {
    loadPagos()
  }, [clienteId])

  useEffect(() => {
    const loadGestor = async () => {
      if (clienteActualizado?.gestor_id) {
        const gestor = await obtenerGestor(clienteActualizado.gestor_id, true)
        if (gestor) {
          setGestorNombre(gestor.nombre)
        }
      }
    }
    loadGestor()
  }, [clienteActualizado?.gestor_id, obtenerGestor])

  const handlePagoRegistered = () => {
    loadPagos()
    setShowModal(false)
    setSelectedPago(null)
  }

  const openRegistrarModal = (pago: Pago) => {
    if (!canRegisterPayments) {
      toast.error('No tienes permisos para registrar pagos')
      return
    }
    setSelectedPago(pago)
    setShowModal(true)
  }

  const handleReestructurar = () => {
    if (!canReestructurar) {
      toast.error('No tienes permisos para reestructurar el calendario')
      return
    }
    setShowModalReestructurar(true)
  }

  const handleFechaActualizada = () => {
    loadPagos()
  }

  const descargarPDF = async () => {
    if (!cliente) return

    setGenerandoPDF(true)
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPos = 15
      const pageHeight = pdf.internal.pageSize.getHeight()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 10

      // Título
      pdf.setFontSize(16)
      pdf.text('ESTADO DE CUENTA', margin, yPos)
      yPos += 10

      // Datos del cliente
      pdf.setFontSize(10)
      pdf.text(`Cliente: ${cliente.nombre_completo}`, margin, yPos)
      yPos += 6
      pdf.text(`Contrato: ${cliente.numero_contrato || 'N/A'}`, margin, yPos)
      yPos += 6
      pdf.text(`Gestor: ${gestorNombre}`, margin, yPos)
      yPos += 6
      pdf.text(`Estado: ${cliente.estado}`, margin, yPos)
      yPos += 6
      pdf.text(`Descuento: ${formatCurrency(cliente.descuento)}`, margin, yPos)
      yPos += 6
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, margin, yPos)
      yPos += 10

      // Resumen
      pdf.setFontSize(11)
      pdf.text('RESUMEN', margin, yPos)
      yPos += 6

      const totalProgramado = pagos.reduce((sum, p) => sum + p.monto_programado, 0)
      const totalPagado = pagos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
      const pendiente = pagos.reduce((sum, p) => sum + (p.monto_programado - (p.monto_pagado || 0)), 0)

      pdf.setFontSize(9)
      pdf.text(`Monto Programado: ${formatCurrency(totalProgramado)}`, margin, yPos)
      yPos += 5
      pdf.text(`Monto Pagado: ${formatCurrency(totalPagado)}`, margin, yPos)
      yPos += 5
      pdf.text(`Monto Pendiente: ${formatCurrency(pendiente)}`, margin, yPos)
      yPos += 10

      // Tabla de cuotas
      pdf.setFontSize(9)
      pdf.text('DETALLE DE CUOTAS', margin, yPos)
      yPos += 6

      // Encabezados de tabla
      pdf.setFontSize(8)
      const colWidths = [15, 28, 32, 24, 24, 32]
      const headers = ['Cuota', 'Estado', 'F. Programada', 'Programado', 'Pagado', 'Fecha Pago']
      let xPos = margin

      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos)
        xPos += colWidths[i]
      })

      yPos += 5
      pdf.setDrawColor(200)
      pdf.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 4

      // Datos de cuotas
      pagos.forEach((pago) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage()
          yPos = 15
        }

        xPos = margin
        const estadoTexto = pago.estado === 'pagado' ? 'Pagado' : pago.estado === 'vencido' ? 'Vencido' : 'Pendiente'
        const datos = [
          pago.numero_pago.toString(),
          estadoTexto,
          formatDate(pago.fecha_programada),
          formatCurrency(pago.monto_programado),
          formatCurrency(pago.monto_pagado || 0),
          pago.fecha_pago ? formatDate(pago.fecha_pago) : 'N/A'
        ]

        datos.forEach((dato, i) => {
          pdf.text(dato, xPos, yPos, { maxWidth: colWidths[i] - 2 })
          xPos += colWidths[i]
        })

        yPos += 5
      })

      const nombreArchivo = `Estado_Cuenta_${cliente.nombre_completo?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(nombreArchivo)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el PDF. Intenta nuevamente.')
    } finally {
      setGenerandoPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 text-sm mt-2">Cargando pagos...</p>
      </div>
    )
  }

  if (pagos.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No hay pagos programados</p>
      </div>
    )
  }

  const estadoIcon = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return <CheckCircle size={16} className="text-green-600" />
      case 'vencido':
        return <AlertCircle size={16} className="text-red-600" />
      default:
        return <Clock size={16} className="text-yellow-600" />
    }
  }

  const estadoColor = (estado: string) => {
    switch (estado) {
      case 'pagado':
        return 'bg-green-50 border-green-200'
      case 'vencido':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  const totalProgramado = pagos.reduce((sum, p) => sum + p.monto_programado, 0)
  const totalPagado = pagos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
  // Calcular cuotas pagadas directamente: total_pagado / monto_pago
  const cuotasPagadas = clienteActualizado?.monto_pago ? clienteActualizado.total_pagado / clienteActualizado.monto_pago : 0
  // Pendiente = suma de lo que falta pagar en cada cuota (monto_programado - monto_pagado)
  // Esto refleja correctamente cuando el cliente paga más o menos del monto programado
  const pendiente = pagos.reduce((sum, p) => sum + (p.monto_programado - (p.monto_pagado || 0)), 0)

  return (
    <div className="space-y-2" ref={calendarioRef}>
      {/* Encabezado con Resumen */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            <h4 className="font-semibold text-sm text-gray-900">Calendario de Pagos</h4>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReestructurar}
              disabled={!canReestructurar}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                canReestructurar
                  ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={canReestructurar ? 'Reestructurar todas las fechas' : 'No tienes permisos para reestructurar'}
            >
              <RefreshCw size={14} />
              Reestructurar
            </button>
            <button
              onClick={descargarPDF}
              disabled={generandoPDF}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded"
              title="Descargar PDF"
            >
              {generandoPDF ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Download size={14} />
                  PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info del Gestor y Cuotas Pagadas */}
        {(gestorNombre || clienteActualizado) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-purple-600 font-medium">Gestor Asignado</p>
                <p className="text-gray-900 font-semibold">{gestorNombre || 'N/A'}</p>
              </div>
              <div>
                <p className="text-purple-600 font-medium">Cuotas Pagadas</p>
                <p className="text-gray-900 font-semibold">{Math.floor(cuotasPagadas)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen Compacto */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-600 font-medium">Programado</p>
              <p className="text-xs font-bold text-gray-900">{formatCurrency(totalProgramado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Pagado</p>
              <p className="text-xs font-bold text-green-600">{formatCurrency(totalPagado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Pendiente</p>
              <p className="text-xs font-bold text-red-600">{formatCurrency(pendiente)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {pagos.map((pago) => (
          <div
            key={pago.id}
            className={`p-2 rounded-lg border text-xs ${estadoColor(pago.estado)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <div className="mt-0.5">{estadoIcon(pago.estado)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-gray-900">
                      Cuota {pago.numero_pago}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      pago.estado === 'pagado'
                        ? 'bg-green-100 text-green-800'
                        : pago.estado === 'vencido'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pago.estado === 'pagado' ? 'Pagado' : pago.estado === 'vencido' ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-2 mb-1 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Prog:</span> {formatDate(pago.fecha_programada)}
                    </div>
                    {pago.fecha_pago && (
                      <div>
                        <span className="font-medium text-green-700">Pagado:</span> {formatDate(pago.fecha_pago)}
                      </div>
                    )}
                  </div>

                  {/* Gestor */}
                  {pago.gestor && (
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">Gestor:</span> {pago.gestor.nombre}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {formatCurrency(pago.monto_programado)}
                  </p>
                  {pago.monto_pagado > 0 && (
                    <p className="text-xs text-green-600">
                      {formatCurrency(pago.monto_pagado)}
                    </p>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-1 flex-col">
                  {pago.estado !== 'pagado' ? (
                    <button
                      onClick={() => openRegistrarModal(pago)}
                      disabled={!canRegisterPayments}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                        canRegisterPayments
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={canRegisterPayments ? 'Registrar pago' : 'No tienes permisos para registrar pagos'}
                    >
                      <Plus size={12} />
                      Registrar
                    </button>
                  ) : (
                    <button
                      onClick={() => openRegistrarModal(pago)}
                      disabled={!canRegisterPayments}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        canRegisterPayments
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      title={canRegisterPayments ? 'Editar pago registrado' : 'No tienes permisos para editar pagos'}
                    >
                      <Edit2 size={12} />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {pago.notas && (
              <div className="mt-2 text-xs text-gray-600 italic border-t pt-2">
                {pago.notas}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal para registrar/editar pagos */}
      {showModal && selectedPago && (
        <ModalRegistrarPago
          pago={selectedPago}
          cliente={clienteActualizado}
          onClose={() => {
            setShowModal(false)
            setSelectedPago(null)
          }}
          onSuccess={handlePagoRegistered}
        />
      )}

      {/* Modal para reestructurar calendario */}
      {showModalReestructurar && (
        <ModalReestructurarCalendario
          pagos={pagos}
          onClose={() => setShowModalReestructurar(false)}
          onSuccess={handleFechaActualizada}
        />
      )}
    </div>
  )
}
