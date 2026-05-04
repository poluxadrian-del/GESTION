import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Download } from 'lucide-react'
import { useClientes } from '@/hooks/useClientes'
import { useGestores } from '@/hooks/useGestores'
import { useAuthStore } from '@/store/authStore'
import type { Cliente, EstadoCliente } from '@/types'
import ClientesTable from '@/components/clientes/ClientesTable'
import ClienteForm from '@/components/clientes/ClienteForm'
import ClienteDetail from '@/components/clientes/ClienteDetail'
import CalendarioPagos from '@/components/clientes/CalendarioPagos'
import HistorialSeguimientos from '@/components/clientes/HistorialSeguimientos'
import Modal from '@/components/shared/Modal'
import ModalImportarClientes from '@/components/clientes/ModalImportarClientes'
import { importarClientesExcel, validarClientesExcel, type ClienteExcelRow } from '@/utils/importExcel'
import toast from 'react-hot-toast'

export default function ClientesPage() {
  const { obtenerClientes, crearCliente, actualizarCliente, generarCalendarioPagosCliente, loading } = useClientes()
  const { obtenerGestores } = useGestores()
  const { usuario } = useAuthStore()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [gestores, setGestores] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoCliente | 'todos'>('todos')
  const [filterGestor, setFilterGestor] = useState<string>('todos')
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showHistorialModal, setShowHistorialModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [generandoCalendario, setGenerandoCalendario] = useState(false)
  const [clientesValidos, setClientesValidos] = useState<ClienteExcelRow[]>([])
  const [erroresValidacion, setErroresValidacion] = useState<{ fila: number; error: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determinar permisos basados en rol
  const canEditClientes = usuario?.rol !== 'supervisor'
  const canImportClientes = usuario?.rol !== 'supervisor'

  // Cargar clientes al montar
  useEffect(() => {
    loadClientes()
    loadGestores()
  }, [])

  const loadGestores = async () => {
    const data = await obtenerGestores()
    setGestores(data)
  }

  const loadClientes = async () => {
    const data = await obtenerClientes()
    setClientes(data)
  }

  // Sincronizar selectedCliente cuando la lista de clientes cambia
  // Esto asegura que ClienteDetail siempre muestre datos actualizados (ej: total_pagado)
  useEffect(() => {
    if (selectedCliente) {
      const clienteActualizado = clientes.find(c => c.id === selectedCliente.id)
      if (clienteActualizado) {
        setSelectedCliente(clienteActualizado)
      }
    }
  }, [clientes])

  // Filtrar clientes por búsqueda, estado y gestor
  const filteredClientes = clientes.filter(cliente => {
    const matchSearch = cliente.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      cliente.numero_contrato.includes(search) ||
      cliente.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchEstado = filterEstado === 'todos' || cliente.estado === filterEstado
    
    const matchGestor = filterGestor === 'todos' || cliente.gestor_id === filterGestor
    
    return matchSearch && matchEstado && matchGestor
  })

  const handleCreateCliente = async (data: any) => {
    try {
      console.log('Creando cliente:', data)
      const newCliente = await crearCliente(data)
      console.log('Cliente creado:', newCliente)
      if (newCliente) {
        setClientes([newCliente, ...clientes])
        setShowFormModal(false)
      }
    } catch (error) {
      console.error('Error al crear cliente:', error)
    }
  }

  const handleUpdateCliente = async (data: any) => {
    try {
      if (!editingCliente) return
      console.log('Actualizando cliente:', editingCliente.id, data)
      const updated = await actualizarCliente(editingCliente.id, data)
      console.log('Cliente actualizado:', updated)
      if (updated) {
        setClientes(clientes.map(c => c.id === updated.id ? updated : c))
        setEditingCliente(null)
        setShowFormModal(false)
      }
    } catch (error) {
      console.error('Error al actualizar cliente:', error)
    }
  }

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowDetailModal(true)
  }

  const handleEditCliente = (cliente: Cliente) => {
    if (!canEditClientes) {
      toast.error('No tienes permisos para editar clientes')
      return
    }
    setEditingCliente(cliente)
    setShowFormModal(true)
  }

  const handleGenerarCalendario = async () => {
    if (!editingCliente) return
    setGenerandoCalendario(true)
    const success = await generarCalendarioPagosCliente(editingCliente.id)
    setGenerandoCalendario(false)
    if (success) {
      // Recargar el cliente actualizado
      const data = await obtenerClientes()
      setClientes(data)
      // Actualizar el cliente siendo editado
      const updated = data.find(c => c.id === editingCliente.id)
      if (updated) {
        setEditingCliente(updated)
      }
    }
  }

  const handleOpenNewForm = () => {
    setEditingCliente(null)
    setShowFormModal(true)
  }

  const handleViewCalendar = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowCalendarModal(true)
  }

  const handlePagoRegistradoEnCalendario = async () => {
    // Los triggers automáticamente actualizaron:
    // - clientes.total_pagado
    // - calendarios_pagos.saldo_pendiente
    // - calendarios_pagos.estado
    
    // Recargar lista completa para obtener datos frescos con saldo recalculado
    const clientesActualizados = await obtenerClientes()
    setClientes(clientesActualizados)
    
    // Sincronizar el cliente seleccionado con datos nuevos (importante para ClienteDetail)
    if (selectedCliente) {
      const clienteActualizado = clientesActualizados.find(c => c.id === selectedCliente.id)
      if (clienteActualizado) {
        setSelectedCliente(clienteActualizado)
      }
    }
  }

  const handleImportarExcel = () => {
    if (!canImportClientes) {
      toast.error('No tienes permisos para importar clientes')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canImportClientes) {
      toast.error('No tienes permisos para importar clientes')
      return
    }
    
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast.loading('Leyendo archivo...')
      const clientesExcel = await importarClientesExcel(file)
      const { validos, errores } = validarClientesExcel(clientesExcel)

      setClientesValidos(validos)
      setErroresValidacion(errores)
      setShowImportModal(true)
      toast.dismiss()

      if (errores.length > 0) {
        toast.error(`Se encontraron ${errores.length} error(es) en el archivo`)
      }
    } catch (error) {
      toast.dismiss()
      toast.error(error instanceof Error ? error.message : 'Error al procesar el archivo')
      console.error(error)
    }

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImportarClientes = async (clientesAImportar: ClienteExcelRow[], gestorSeleccionado?: string) => {
    if (!canImportClientes) {
      toast.error('No tienes permisos para importar clientes')
      return
    }
    
    let exitosos = 0
    let errores = 0

    try {
      for (const clienteExcel of clientesAImportar) {
        try {
          // Determinar el gestor_id
          let gestorId = gestorSeleccionado
          if (!gestorId && clienteExcel.gestor_nombre) {
            // Buscar el gestor por nombre
            const gestorEncontrado = gestores.find(
              g => g.nombre.toLowerCase() === clienteExcel.gestor_nombre?.toLowerCase()
            )
            gestorId = gestorEncontrado?.id
          }

          if (!gestorId) {
            errores++
            toast.error(`Cliente ${clienteExcel.numero_contrato}: No se especificó gestor`)
            continue
          }

          // Calcular monto_pago si no está especificado
          const precioVenta = clienteExcel.precio_venta || 0
          const descuento = clienteExcel.descuento || 0
          const totalAPagar = precioVenta - descuento
          const numeroPagos = clienteExcel.numero_pagos || 12
          const montoPago = clienteExcel.monto_pago || (totalAPagar / numeroPagos)

          // Calcular fecha_primer_pago
          const fechaPrimerPago = clienteExcel.fecha_primer_pago || new Date().toISOString().split('T')[0]
          const diaPago = clienteExcel.dia_pago || 1

          const nuevoCliente = await crearCliente({
            numero_contrato: clienteExcel.numero_contrato,
            nombre_completo: clienteExcel.nombre_completo,
            telefono_celular: clienteExcel.telefono_celular,
            email: clienteExcel.email,
            ubicacion: clienteExcel.ubicacion,
            empresa: clienteExcel.empresa,
            telefono_empresa: clienteExcel.telefono_empresa,
            ref_nombre: clienteExcel.ref_nombre,
            ref_telefono: clienteExcel.ref_telefono,
            gestor_id: gestorId,
            fecha_inicio: clienteExcel.fecha_inicio || new Date().toISOString().split('T')[0],
            precio_venta: precioVenta,
            descuento: descuento,
            numero_pagos: numeroPagos,
            frecuencia_pago: clienteExcel.frecuencia_pago || 'mensual',
            mensualidades: clienteExcel.mensualidades || numeroPagos,
            monto_pago: montoPago,
            dia_pago: diaPago,
            fecha_primer_pago: fechaPrimerPago,
            vendedor: clienteExcel.vendedor,
            factura: clienteExcel.factura || false,
            comision: clienteExcel.comision || false,
            estado: (clienteExcel.estado as any) || 'inicio',
            notas: clienteExcel.notas,
          })

          if (nuevoCliente) {
            exitosos++
          }
        } catch (error) {
          errores++
          console.error(`Error al crear cliente ${clienteExcel.numero_contrato}:`, error)
        }
      }

      // Recargar clientes
      const data = await obtenerClientes()
      setClientes(data)

      // Mostrar resumen
      toast.success(`${exitosos} cliente(s) importado(s) correctamente`)
      if (errores > 0) {
        toast.error(`${errores} cliente(s) no pudieron importarse`)
      }

      setShowImportModal(false)
      setClientesValidos([])
      setErroresValidacion([])
    } catch (error) {
      console.error('Error al importar clientes:', error)
      toast.error('Error al importar clientes')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con título y botones */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-600 mt-1">Gestión de clientes y cartera</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelected}
            className="hidden"
          />
          <button
            onClick={handleImportarExcel}
            disabled={!canImportClientes}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canImportClientes
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canImportClientes ? 'No tienes permisos para importar clientes' : ''}
          >
            <Download size={18} />
            Importar Excel
          </button>
          <button
            onClick={handleOpenNewForm}
            disabled={!canEditClientes}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canEditClientes
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={!canEditClientes ? 'No tienes permisos para crear clientes' : ''}
          >
            <Plus size={18} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Búsqueda y Filtros */}
      <div className="flex items-center gap-4">
        <div className="w-96 relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as EstadoCliente | 'todos')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
        >
          <option value="todos">Todos los estados</option>
          <option value="inicio">Inicio</option>
          <option value="activo">Activo</option>
          <option value="pausa">Pausa</option>
          <option value="liquidado">Liquidado</option>
        </select>

        <select
          value={filterGestor}
          onChange={(e) => setFilterGestor(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
        >
          <option value="todos">Todos los gestores</option>
          {gestores.filter(g => g.activo).map(gestor => (
            <option key={gestor.id} value={gestor.id}>
              {gestor.nombre}
            </option>
          ))}
        </select>

        <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
          {filteredClientes.length} cliente(s)
        </div>
      </div>

      {/* Tabla */}
      <ClientesTable
        clientes={filteredClientes}
        loading={loading}
        onSelectCliente={handleSelectCliente}
        onEditCliente={handleEditCliente}
        onViewCalendar={handleViewCalendar}
        canEdit={canEditClientes}
      />

      {/* Modal Formulario */}
      <Modal
        isOpen={showFormModal}
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        onClose={() => {
          setShowFormModal(false)
          setEditingCliente(null)
        }}
        size="lg"
      >
        <ClienteForm
          cliente={editingCliente}
          onSubmit={editingCliente ? handleUpdateCliente : handleCreateCliente}
          onCancel={() => {
            setShowFormModal(false)
            setEditingCliente(null)
          }}
          loading={loading}
          onGenerarCalendario={handleGenerarCalendario}
          generandoCalendario={generandoCalendario}
        />
      </Modal>

      {/* Modal Detalle */}
      <Modal
        isOpen={showDetailModal}
        title="Detalle del Cliente"
        onClose={() => {
          setShowDetailModal(false)
          setSelectedCliente(null)
        }}
        size="lg"
      >
        {selectedCliente && (
          <ClienteDetail
            key={selectedCliente.id}
            cliente={selectedCliente}
            onShowHistorial={() => {
              setShowDetailModal(false)
              setShowHistorialModal(true)
            }}
          />
        )}
      </Modal>

      {/* Modal Calendario */}
      <Modal
        isOpen={showCalendarModal}
        title={`Calendario de Pagos - ${selectedCliente?.nombre_completo}`}
        onClose={() => {
          setShowCalendarModal(false)
          setSelectedCliente(null)
        }}
        size="xl"
      >
        {selectedCliente && (
          <CalendarioPagos 
            clienteId={selectedCliente.id} 
            cliente={selectedCliente}
            onPagoRegistrado={handlePagoRegistradoEnCalendario}
          />
        )}
      </Modal>

      {/* Modal Historial de Seguimientos */}
      {showHistorialModal && selectedCliente && (
        <HistorialSeguimientos
          clienteId={selectedCliente.id}
          clienteNombre={selectedCliente.nombre_completo}
          onClose={() => setShowHistorialModal(false)}
        />
      )}

      {/* Modal Importar Clientes */}
      <ModalImportarClientes
        isOpen={showImportModal}
        clientesValidos={clientesValidos}
        erroresValidacion={erroresValidacion}
        gestores={gestores}
        onImportar={handleImportarClientes}
        onCancel={() => {
          setShowImportModal(false)
          setClientesValidos([])
          setErroresValidacion([])
        }}
      />
    </div>
  )
}
