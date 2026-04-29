import { useState, useEffect } from 'react'
import { Search, Download } from 'lucide-react'
import { exportarExcel } from '@/utils/exportExcel'
import { useComisiones, type ClienteConComision } from '@/hooks/useComisiones'
import ComisionesTable from '@/components/comisiones/ComisionesTable'

export default function ComisionesPage() {
  const { obtenerClientesSinComision, marcarComisionPagada, marcarTodosComisonPagada, loading } = useComisiones()
  const [clientes, setClientes] = useState<ClienteConComision[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    const data = await obtenerClientesSinComision()
    setClientes(data)
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    cliente.numero_contrato.toLowerCase().includes(search.toLowerCase()) ||
    (cliente.vendedor && cliente.vendedor.toLowerCase().includes(search.toLowerCase())) ||
    (cliente.gestor?.nombre && cliente.gestor.nombre.toLowerCase().includes(search.toLowerCase()))
  )

  const handleMarcarComision = async (clienteId: string) => {
    const success = await marcarComisionPagada(clienteId)
    if (success) {
      // Actualizar lista local
      setClientes(clientes.filter(c => c.id !== clienteId))
    }
  }

  const handleMarcarTodos = async () => {
    if (filteredClientes.length === 0) {
      return;
    }
    
    const confirmacion = window.confirm(
      `¿Deseas marcar ${filteredClientes.length} comisiones como pagadas?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmacion) return;

    const success = await marcarTodosComisonPagada(filteredClientes.map(c => c.id))
    if (success) {
      // Actualizar lista local
      setClientes(clientes.filter(c => !filteredClientes.map(fc => fc.id).includes(c.id)))
      setSearch('')
    }
  }

  const handleDescargarExcel = () => {
    const datosExport = filteredClientes.map(cliente => ({
      'Cliente': cliente.nombre_completo,
      'Contrato': cliente.numero_contrato,
      'Vendedor': cliente.vendedor || '-',
      'Gestor': cliente.gestor?.nombre || '-',
      'Fecha 1er Pago': cliente.pagos_info?.primer_pago_fecha || '-',
      'Total Pagado': cliente.total_pagado,
      'Notas': cliente.notas || '-',
    }))
    exportarExcel(datosExport, 'Comisiones_Pendientes', 'Comisiones')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Control de Comisiones</h1>
        <p className="text-gray-600 mt-1">Registra los pagos de comisión por primera cuota cobrada</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por cliente, contrato, vendedor o gestor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={loadClientes}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              onClick={handleDescargarExcel}
              disabled={filteredClientes.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              title="Descargar datos en formato Excel"
            >
              <Download size={18} />
              Excel
            </button>
            <button
              onClick={handleMarcarTodos}
              disabled={filteredClientes.length === 0 || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              title="Marcar todos los clientes mostrados como comisión pagada"
            >
              ✓ Marcar Todos
            </button>
          </div>

          {/* Resumen */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{filteredClientes.length}</span> cliente{filteredClientes.length !== 1 ? 's' : ''} pendiente{filteredClientes.length !== 1 ? 's' : ''} de pagar comisión
            </p>
          </div>
        </div>

        <ComisionesTable
          clientes={filteredClientes}
          loading={loading}
          onMarcarComision={handleMarcarComision}
        />
      </div>
    </div>
  )
}
