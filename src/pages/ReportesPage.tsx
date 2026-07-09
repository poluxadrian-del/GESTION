import { useState, useEffect } from 'react';
import { Download, Filter, X, Search } from 'lucide-react';
import { useReportes, type ReporteCobranza, type ReportePagosCobrar } from '@/hooks/useReportes';
import { useGestores } from '@/hooks/useGestores';
import { exportarExcel } from '@/utils/exportExcel';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Gestor } from '@/types';

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<'cobranza' | 'pagos'>('cobranza');
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [reporteCobranza, setReporteCobranza] = useState<ReporteCobranza[]>([]);
  const [reportePagos, setReportePagos] = useState<ReportePagosCobrar[]>([]);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [gestorSeleccionado, setGestorSeleccionado] = useState('');
  const [estadoPagoFilter, setEstadoPagoFilter] = useState('');
  const [facturaFilter, setFacturaFilter] = useState('');
  const [estadoClienteFilter, setEstadoClienteFilter] = useState('');
  const [excluirCondonar, setExcluirCondonar] = useState(true);

  const { loading, obtenerReporteCobranza, obtenerReportePagosCobrar } = useReportes();
  const { obtenerGestores } = useGestores();

  // Cargar gestores al montar
  useEffect(() => {
    const loadGestores = async () => {
      const data = await obtenerGestores(true);
      setGestores(data);
    };
    loadGestores();
  }, [obtenerGestores]);

  // Cargar reporte cuando cambian filtros o tab
  const loadReportes = async () => {
    if (activeTab === 'cobranza') {
      let data = await obtenerReporteCobranza(
        fechaDesde || undefined,
        fechaHasta || undefined,
        gestorSeleccionado || undefined,
        facturaFilter !== '' ? (facturaFilter === 'true' ? true : false) : undefined,
        estadoClienteFilter || undefined
      );
      // Filtrar cobranza excluyendo gestor condonar
      if (excluirCondonar) {
        data = data.filter(r => r.gestor_nombre?.toLowerCase() !== 'condonar');
      }
      setReporteCobranza(data);
    } else {
      let data = await obtenerReportePagosCobrar(
        fechaDesde || undefined,
        fechaHasta || undefined,
        gestorSeleccionado || undefined,
        estadoPagoFilter || undefined
      );
      // Filtrar pagos excluyendo gestor condonar
      if (excluirCondonar) {
        data = data.filter(r => r.gestor_nombre?.toLowerCase() !== 'condonar');
      }
      setReportePagos(data);
    }
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setGestorSeleccionado('');
    setEstadoPagoFilter('');
    setFacturaFilter('');
    setEstadoClienteFilter('');
    setExcluirCondonar(true);
  };

  const descargarReporte = () => {
    if (activeTab === 'cobranza') {
      const datosFormato = reporteCobranzaFiltrado.map(r => ({
        'Fecha Pago': r.fecha_pago,
        'Contrato': r.numero_contrato,
        'Cliente': r.cliente_nombre,
        'Email': r.email,
        'Estado': r.estado_cliente,
        'Gestor': r.gestor_nombre,
        'Monto Pagado': formatCurrency(r.monto_pagado),
        'Total Pagado': formatCurrency(r.total_pagado),
        'Notas': r.notas,
      }));
      exportarExcel(datosFormato, 'Reporte_Cobranza', 'Cobranza');
    } else {
      const datosFormato = reportePagosFiltrado.map(r => ({
        'Cliente': r.cliente_nombre,
        'Cargo': r.cargo,
        'Cuota': r.numero_pago,
        'Fecha Programada': r.fecha_programada,
        'Fecha Pago': r.fecha_pago && r.fecha_pago !== '' ? r.fecha_pago : 'N/A',
        'Monto a Cobrar': formatCurrency(r.monto_programado),
        'Monto Pagado': formatCurrency(r.monto_pagado),
        'Teléfono': r.telefono_celular,
        'Email': r.email,
        'Gestor': r.gestor_nombre,
      }));
      exportarExcel(datosFormato, 'Reporte_Pagos_Cobrar', 'Pagos por Cobrar');
    }
  };

  // Calcular totales aplicando filtro de condonar
  const reporteCobranzaFiltrado = excluirCondonar 
    ? reporteCobranza.filter(r => r.gestor_nombre?.toLowerCase() !== 'condonar')
    : reporteCobranza;
  
  const reportePagosFiltrado = excluirCondonar
    ? reportePagos.filter(r => r.gestor_nombre?.toLowerCase() !== 'condonar')
    : reportePagos;

  const totalCobranza = reporteCobranzaFiltrado.reduce((sum, r) => sum + r.monto_pagado, 0);
  const totalPagosCobrar = reportePagosFiltrado.reduce((sum, r) => sum + r.monto_programado, 0);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-3 px-3">
          <button
            onClick={() => setActiveTab('cobranza')}
            className={`py-2 px-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'cobranza'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Reporte de Cobranza
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`py-2 px-3 text-sm font-medium border-b-2 transition ${
              activeTab === 'pagos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pagos a Cobrar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-3 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={18} className="text-gray-600" />
          <h2 className="text-base font-semibold text-gray-900">Filtros</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Gestor
            </label>
            <select
              value={gestorSeleccionado}
              onChange={(e) => setGestorSeleccionado(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'cobranza' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Factura
                </label>
                <select
                  value={facturaFilter || ''}
                  onChange={(e) => setFacturaFilter(e.target.value as any)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Estado Cliente
                </label>
                <select
                  value={estadoClienteFilter}
                  onChange={(e) => setEstadoClienteFilter(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="pausa">Pausa</option>
                  <option value="liquidado">Liquidado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  &nbsp;
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={excluirCondonar}
                    onChange={(e) => setExcluirCondonar(e.target.checked)}
                    className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  Excluir Condonar
                </label>
              </div>
            </>
          )}

          {activeTab === 'pagos' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Estado Pago
              </label>
              <select
                value={estadoPagoFilter}
                onChange={(e) => setEstadoPagoFilter(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcialmente_pagado">Parcialmente Pagado</option>
                <option value="pagado">Pagado</option>
              </select>
            </div>
          )}

          <div className="flex items-end gap-1">
            <button
              onClick={loadReportes}
              disabled={loading}
              className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded flex items-center justify-center gap-1"
            >
              <Search size={14} />
              Cargar
            </button>
            <button
              onClick={limpiarFiltros}
              className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Resumen */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">
                {activeTab === 'cobranza' ? 'Total Cobranza' : 'Total a Cobrar'}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(activeTab === 'cobranza' ? totalCobranza : totalPagosCobrar)}
              </p>
            </div>
            <button
              onClick={descargarReporte}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded flex items-center gap-1"
            >
              <Download size={16} />
              Descargar
            </button>
          </div>
        </div>

        {/* Tabla Cobranza */}
        {activeTab === 'cobranza' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Fecha Pago</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Contrato</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Estado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Gestor</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto Pagado</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Total Pagado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Cargando...
                    </td>
                  </tr>
                ) : reporteCobranzaFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Presiona "Cargar" para ver los datos
                    </td>
                  </tr>
                ) : (
                  reporteCobranzaFiltrado.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-900">{formatDate(r.fecha_pago)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.numero_contrato}</td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{r.cliente_nombre}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.email}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          r.estado_cliente === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : r.estado_cliente === 'pausa'
                            ? 'bg-yellow-100 text-yellow-800'
                            : r.estado_cliente === 'liquidado'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {r.estado_cliente?.charAt(0).toUpperCase() + r.estado_cliente?.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.gestor_nombre}</td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(r.monto_pagado)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(r.total_pagado)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate" title={r.notas}>
                        {r.notas || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabla Pagos a Cobrar */}
        {activeTab === 'pagos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Cargo</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">Cuota</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Fecha Programada</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Fecha Pago Real</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto a Cobrar</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto Pagado</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Teléfono</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Gestor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Cargando...
                    </td>
                  </tr>
                ) : reportePagosFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Presiona "Cargar" para ver los datos
                    </td>
                  </tr>
                ) : (
                  reportePagosFiltrado.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{r.cliente_nombre}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.cargo}</td>
                      <td className="px-3 py-2 text-xs text-center text-gray-600">{r.numero_pago}</td>
                      <td className="px-3 py-2 text-xs text-gray-900">{formatDate(r.fecha_programada)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {r.fecha_pago ? formatDate(r.fecha_pago) : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(r.monto_programado)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-green-700">
                        {formatCurrency(r.monto_pagado)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.telefono_celular}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.email}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.gestor_nombre}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
