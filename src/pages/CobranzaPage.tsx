import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePagos } from '@/hooks/usePagos'
import type { Pago } from '@/types'
import PagosTable from '@/components/cobranza/PagosTable'
import CarteraVencida from '@/components/cobranza/CarteraVencida'
import ModalRegistrarPago from '@/components/cobranza/ModalRegistrarPago'
import ModalRegistrarSeguimiento from '@/components/cobranza/ModalRegistrarSeguimiento'

export default function CobranzaPage() {
  const { obtenerPagosPendientes, obtenerCarteraVencida } = usePagos()
  const [selectedTab, setSelectedTab] = useState<'pendientes' | 'vencidos'>('pendientes')
  const [pagosPendientes, setPagosPendientes] = useState<Pago[]>([])
  const [pagosVencidos, setPagosVencidos] = useState<Pago[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null)
  const [selectedPagoSeguimiento, setSelectedPagoSeguimiento] = useState<Pago | null>(null)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPagos, setTotalPagos] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const pageSize = 50

  // Paginación Cartera Vencida
  const [currentPageCartera, setCurrentPageCartera] = useState(1)
  const [totalPagosCartera, setTotalPagosCartera] = useState(0)
  const [totalPagesCartera, setTotalPagesCartera] = useState(0)
  
  // Filtros
  const [filterCliente, setFilterCliente] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [filterGestor, setFilterGestor] = useState('')
  const [filterGestorCartera, setFilterGestorCartera] = useState('')

  useEffect(() => {
    loadData()
  }, [currentPage, filterCliente, filterFechaDesde, filterFechaHasta, filterGestor, currentPageCartera, filterGestorCartera, selectedTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pendientesResult, carteraResult] = await Promise.all([
        obtenerPagosPendientes(currentPage, pageSize, {
          cliente: filterCliente,
          fechaDesde: filterFechaDesde,
          fechaHasta: filterFechaHasta,
          gestor: filterGestor,
        }),
        obtenerCarteraVencida(currentPageCartera, pageSize, {
          gestor: filterGestorCartera,
        }),
      ])

      setPagosPendientes(pendientesResult.data)
      setTotalPagos(pendientesResult.total)
      setTotalPages(pendientesResult.totalPages)
      setPagosVencidos(carteraResult.data)
      setTotalPagosCartera(carteraResult.total)
      setTotalPagesCartera(carteraResult.totalPages)
    } finally {
      setLoading(false)
    }
  }

  const handleSeguimientoRegistered = () => {
    loadData()
    setSelectedPagoSeguimiento(null)
  }

  const clearFilters = () => {
    setFilterCliente('')
    setFilterFechaDesde('')
    setFilterFechaHasta('')
    setFilterGestor('')
    setCurrentPage(1)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePreviousPageCartera = () => {
    if (currentPageCartera > 1) {
      setCurrentPageCartera(currentPageCartera - 1)
    }
  }

  const handleNextPageCartera = () => {
    if (currentPageCartera < totalPagesCartera) {
      setCurrentPageCartera(currentPageCartera + 1)
    }
  }

  const getUniqueGestores = () => {
    const gestores = pagosPendientes
      .map((p) => (p.gestor as any)?.nombre)
      .filter((g, i, arr) => g && arr.indexOf(g) === i)
      .sort()
    return gestores
  }

  const getUniqueGestoresCartera = () => {
    const gestores = pagosVencidos
      .map((p) => (p.gestor as any)?.nombre)
      .filter((g, i, arr) => g && arr.indexOf(g) === i)
      .sort()
    return gestores
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setSelectedTab('pendientes')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              selectedTab === 'pendientes'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Pagos Pendientes
          </button>
          <button
            onClick={() => setSelectedTab('vencidos')}
            className={`px-6 py-4 font-medium border-b-2 transition-colors ${
              selectedTab === 'vencidos'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Cartera Vencida
          </button>
        </div>

        {/* Contenido */}
        <div>
          {selectedTab === 'pendientes' ? (
            <>
              {/* Filtros */}
              <div className="border-b border-gray-200 p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Buscar Cliente</label>
                    <input
                      type="text"
                      value={filterCliente}
                      onChange={(e) => setFilterCliente(e.target.value)}
                      placeholder="Nombre del cliente..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
                    <input
                      type="date"
                      value={filterFechaDesde}
                      onChange={(e) => setFilterFechaDesde(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={filterFechaHasta}
                      onChange={(e) => setFilterFechaHasta(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gestor</label>
                    <select
                      value={filterGestor}
                      onChange={(e) => setFilterGestor(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos</option>
                      {getUniqueGestores().map((gestor) => (
                        <option key={gestor} value={gestor}>
                          {gestor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={clearFilters}
                    disabled={!filterCliente && !filterFechaDesde && !filterFechaHasta && !filterGestor}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1 justify-center"
                  >
                    <X size={16} />
                    Limpiar
                  </button>
                </div>
              </div>

              <PagosTable
                pagos={pagosPendientes}
                loading={loading}
                onSelectPago={setSelectedPago}
                onSelectSeguimiento={setSelectedPagoSeguimiento}
              />

              {/* Paginación */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {pagosPendientes.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} a{' '}
                  {Math.min(currentPage * pageSize, totalPagos)} de {totalPagos} registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loading}
                    className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Filtro Cartera Vencida */}
              <div className="border-b border-gray-200 p-4 bg-gray-50">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Gestor</label>
                    <select
                      value={filterGestorCartera}
                      onChange={(e) => {
                        setFilterGestorCartera(e.target.value)
                        setCurrentPageCartera(1)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos</option>
                      {getUniqueGestoresCartera().map((gestor) => (
                        <option key={gestor} value={gestor}>
                          {gestor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setFilterGestorCartera('')
                      setCurrentPageCartera(1)
                    }}
                    disabled={!filterGestorCartera}
                    className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1 justify-center"
                  >
                    <X size={16} />
                    Limpiar
                  </button>
                </div>
              </div>

              <CarteraVencida
                pagos={pagosVencidos}
                loading={loading}
                onSelectPago={setSelectedPago}
              />

              {/* Paginación Cartera Vencida */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {pagosVencidos.length > 0 ? (currentPageCartera - 1) * pageSize + 1 : 0} a{' '}
                  {Math.min(currentPageCartera * pageSize, totalPagosCartera)} de {totalPagosCartera} registros
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPageCartera}
                    disabled={currentPageCartera === 1 || loading}
                    className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-600 px-2">
                    Página {currentPageCartera} de {totalPagesCartera}
                  </span>
                  <button
                    onClick={handleNextPageCartera}
                    disabled={currentPageCartera === totalPagesCartera || loading}
                    className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {selectedPago && (
        <ModalRegistrarPago
          pago={selectedPago}
          cliente={selectedPago.cliente as any}
          onClose={() => setSelectedPago(null)}
          onSuccess={handleSeguimientoRegistered}
        />
      )}

      {/* Modal Registrar/Editar Seguimiento */}
      {selectedPagoSeguimiento && (
        <ModalRegistrarSeguimiento
          pago={selectedPagoSeguimiento}
          onClose={() => setSelectedPagoSeguimiento(null)}
          onSuccess={handleSeguimientoRegistered}
        />
      )}
    </div>
  )
}
