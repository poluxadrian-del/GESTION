import { useEffect, useState, useRef } from 'react'
import { usePagos } from '@/hooks/usePagos'
import { useGestores } from '@/hooks/useGestores'
import { useClientes } from '@/hooks/useClientes'
import { useAuthStore } from '@/store/authStore'
import type { CalendarioPago, Cliente } from '@/types'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { Calendar, Plus, Download, RefreshCw } from 'lucide-react'
import ModalRegistrarPagoRealizado from '@/components/cobranza/ModalRegistrarPagoRealizado'
import ModalReestructurarCalendario from '@/components/clientes/ModalReestructurarCalendario'
import HistorialPagosRealizados from '@/components/clientes/HistorialPagosRealizados'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'

interface CalendarioPagosProps {
  clienteId: string
  cliente?: Cliente
  onPagoRegistrado?: () => void
}

export default function CalendarioPagos({ clienteId, cliente, onPagoRegistrado }: CalendarioPagosProps) {
  const { obtenerCalendarioPagos, obtenerResumenCliente, loading } = usePagos()
  const { obtenerGestor } = useGestores()
  const { obtenerClientePorId } = useClientes()
  const { usuario } = useAuthStore()

  const [calendarios, setCalendarios] = useState<CalendarioPago[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [selectedCuota, setSelectedCuota] = useState<CalendarioPago | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showModalReestructurar, setShowModalReestructurar] = useState(false)
  const [gestorNombre, setGestorNombre] = useState<string>('')
  const [clienteActualizado, setClienteActualizado] = useState<Cliente | undefined>(cliente)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [refreshHistorial, setRefreshHistorial] = useState(0) // Trigger para recargar histórico
  const calendarioRef = useRef<HTMLDivElement>(null)

  // Permisos
  const canRegisterPayments = usuario?.rol !== 'supervisor'
  const canReestructurar = usuario?.rol !== 'supervisor'

  const loadCalendarios = async () => {
    const data = await obtenerCalendarioPagos(clienteId)
    setCalendarios(data)

    // Cargar resumen consolidado
    const res = await obtenerResumenCliente(clienteId)
    setResumen(res)
  }

  // Cargar cliente actualizado desde BD
  useEffect(() => {
    const loadClienteActualizado = async () => {
      const data = await obtenerClientePorId(clienteId)
      if (data) {
        setClienteActualizado(data)
      }
    }
    loadClienteActualizado()
  }, [clienteId, obtenerClientePorId])

  // Cargar calendarios al montar
  useEffect(() => {
    loadCalendarios()
  }, [clienteId])

  // Cargar gestor del cliente
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

  const handlePagoRegistrado = () => {
    loadCalendarios()
    setRefreshHistorial(prev => prev + 1) // Trigger para recargar histórico
    setShowModal(false)
    setSelectedCuota(null)
    // Callback si es necesario
    onPagoRegistrado?.()
  }

  const openRegistrarModal = (cuota: CalendarioPago) => {
    if (!canRegisterPayments) {
      toast.error('No tienes permisos para registrar pagos')
      return
    }
    setSelectedCuota(cuota)
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
    loadCalendarios()
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

      if (resumen) {
        pdf.setFontSize(9)
        pdf.text(`Total Programado: ${formatCurrency(resumen.total_programado || 0)}`, margin, yPos)
        yPos += 5
        pdf.text(`Total Pagado: ${formatCurrency(resumen.total_pagado_realizado || 0)}`, margin, yPos)
        yPos += 5
        pdf.text(`Saldo Pendiente: ${formatCurrency(resumen.total_saldo_pendiente || 0)}`, margin, yPos)
        yPos += 5
        pdf.text(`Cuotas Pagadas: ${resumen.cuotas_pagadas}/${resumen.total_cuotas_programadas}`, margin, yPos)
        yPos += 10
      }

      // Tabla de cuotas
      pdf.setFontSize(9)
      pdf.text('DETALLE DE CUOTAS', margin, yPos)
      yPos += 6

      // Encabezados de tabla
      pdf.setFontSize(8)
      const colWidths = [15, 28, 32, 24, 24, 32]
      const headers = ['Cuota', 'Estado', 'F. Programada', 'Monto', 'Saldo', 'Estado']
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
      calendarios.forEach((cuota) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage()
          yPos = 15
        }

        xPos = margin
        const estadoTexto = 
          cuota.estado === 'pagado' ? 'Pagado' : 
          cuota.estado === 'parcialmente_pagado' ? 'Parcial' : 
          'Pendiente'

        const datos = [
          cuota.numero_cuota.toString(),
          estadoTexto,
          formatDate(cuota.fecha_programada),
          formatCurrency(cuota.monto_programado),
          formatCurrency(cuota.saldo_pendiente),
          'OK'
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
      toast.error('Error al generar el PDF')
    } finally {
      setGenerandoPDF(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 text-sm mt-2">Cargando calendario...</p>
      </div>
    )
  }

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
              title={canReestructurar ? 'Reestructurar todas las fechas' : 'No tienes permisos'}
            >
              <RefreshCw size={14} />
              Reestructurar
            </button>
            <button
              onClick={descargarPDF}
              disabled={generandoPDF}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded"
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

        {/* Info del Gestor */}
        {(gestorNombre || resumen) && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-purple-600 font-medium">Gestor Asignado</p>
                <p className="text-gray-900 font-semibold">{gestorNombre || 'N/A'}</p>
              </div>
              {resumen && (
                <div>
                  <p className="text-purple-600 font-medium">Cuotas Pagadas</p>
                  <p className="text-gray-900 font-semibold">{resumen.cuotas_pagadas}/{resumen.total_cuotas_programadas}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resumen Compacto */}
        {resumen && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-600 font-medium">Programado</p>
                <p className="text-xs font-bold text-gray-900">${(resumen.total_programado || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Pagado</p>
                <p className="text-xs font-bold text-green-600">${(resumen.total_pagado_realizado || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Pendiente</p>
                <p className="text-xs font-bold text-red-600">${(resumen.total_saldo_pendiente || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Cuotas */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-700">Cuota</th>
              <th className="px-2 py-2 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-700">Monto</th>
              <th className="px-2 py-2 text-right font-semibold text-gray-700">Saldo</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700">Estado</th>
              <th className="px-2 py-2 text-center font-semibold text-gray-700">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {calendarios.map((cuota) => {
              const estadoClass = 
                cuota.estado === 'pagado' ? 'bg-green-50 hover:bg-green-100' :
                cuota.estado === 'parcialmente_pagado' ? 'bg-yellow-50 hover:bg-yellow-100' :
                'bg-red-50 hover:bg-red-100';
              
              const estadoTexto = 
                cuota.estado === 'pagado' ? 'Pagado' :
                cuota.estado === 'parcialmente_pagado' ? 'Parcial' :
                'Pendiente';

              return (
                <tr key={cuota.id} className={`${estadoClass} transition-colors`}>
                  <td className="px-2 py-2 font-semibold text-gray-900">
                    {cuota.numero_cuota}
                  </td>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">
                    {formatDate(cuota.fecha_programada)}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                    ${cuota.monto_programado.toFixed(2)}
                  </td>
                  <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${
                    cuota.saldo_pendiente > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    ${cuota.saldo_pendiente.toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      cuota.estado === 'pagado'
                        ? 'bg-green-100 text-green-800'
                        : cuota.estado === 'parcialmente_pagado'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {estadoTexto}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => openRegistrarModal(cuota)}
                      disabled={!canRegisterPayments || cuota.estado === 'pagado'}
                      className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                        canRegisterPayments && cuota.estado !== 'pagado'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={cuota.estado === 'pagado' ? 'Cuota pagada' : 'Registrar pago'}
                    >
                      <Plus size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Histórico de Pagos Realizados */}
      <div className="border-t pt-3 mt-3">
        <HistorialPagosRealizados
          clienteId={clienteId}
          refreshTrigger={refreshHistorial}
          onPagoChanged={() => {
            // Cuando hay cambios en el histórico, recargar calendarios y notificar
            loadCalendarios()
            onPagoRegistrado?.()
          }}
        />
      </div>

      {/* Modales */}
      {showModal && selectedCuota && (
        <ModalRegistrarPagoRealizado
          clienteId={clienteId}
          cuota={selectedCuota}
          cliente={clienteActualizado}
          onClose={() => setShowModal(false)}
          onSuccess={handlePagoRegistrado}
        />
      )}

      {showModalReestructurar && (
        <ModalReestructurarCalendario
          clienteId={clienteId}
          onClose={() => setShowModalReestructurar(false)}
          onSuccess={handleFechaActualizada}
        />
      )}
    </div>
  )
}
