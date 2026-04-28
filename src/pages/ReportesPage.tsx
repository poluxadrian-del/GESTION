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
      const data = await obtenerReporteCobranza(
        fechaDesde || undefined,
        fechaHasta || undefined,
        gestorSeleccionado || undefined,
        facturaFilter !== '' ? (facturaFilter === 'true' ? true : false) : undefined
      );
      setReporteCobranza(data);
    } else {
      const data = await obtenerReportePagosCobrar(
        fechaDesde || undefined,
        fechaHasta || undefined,
        gestorSeleccionado || undefined,
        estadoPagoFilter || undefined
      );
      setReportePagos(data);
    }
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setGestorSeleccionado('');
    setEstadoPagoFilter('');
    setFacturaFilter('');
  };

  const descargarReporte = () => {
    if (activeTab === 'cobranza') {
      const datosFormato = reporteCobranza.map(r => ({
        'Fecha Pago': formatDate(r.fecha_pago),
        'Contrato': r.numero_contrato,
        'Cliente': r.cliente_nombre,
        'Gestor': r.gestor_nombre,
        'Monto Pagado': formatCurrency(r.monto_pagado),
      }));
      exportarExcel(datosFormato, 'Reporte_Cobranza', 'Cobranza');
    } else {
      const datosFormato = reportePagos.map(r => ({
        'Cliente': r.cliente_nombre,
        'Cuota': r.numero_pago,
        'Fecha Programada': formatDate(r.fecha_programada),
        'Fecha Pago': r.fecha_pago ? formatDate(r.fecha_pago) : 'N/A',
        'Monto a Cobrar': formatCurrency(r.monto_programado),
        'Monto Pagado': formatCurrency(r.monto_pagado),
        'Factura': r.factura ? 'Sí' : 'No',
        'Gestor': r.gestor_nombre,
        'Estado': r.estado,
      }));
      exportarExcel(datosFormato, 'Reporte_Pagos_Cobrar', 'Pagos por Cobrar');
    }
  };

  const totalCobranza = reporteCobranza.reduce((sum, r) => sum + r.monto_pagado, 0);
  const totalPagosCobrar = reportePagos.reduce((sum, r) => sum + r.monto_programado, 0);

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
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Gestor</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Cargando...
                    </td>
                  </tr>
                ) : reporteCobranza.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Presiona "Cargar" para ver los datos
                    </td>
                  </tr>
                ) : (
                  reporteCobranza.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-900">{formatDate(r.fecha_pago)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.numero_contrato}</td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{r.cliente_nombre}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.gestor_nombre}</td>
                      <td className="px-3 py-2 text-xs text-right font-semibold text-gray-900">
                        {formatCurrency(r.monto_pagado)}
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
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">Cuota</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Fecha Programada</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Fecha Pago Real</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto a Cobrar</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900">Monto Pagado</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">Factura</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Gestor</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Cargando...
                    </td>
                  </tr>
                ) : reportePagos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 text-center text-gray-600 text-xs">
                      Presiona "Cargar" para ver los datos
                    </td>
                  </tr>
                ) : (
                  reportePagos.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{r.cliente_nombre}</td>
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
                      <td className="px-3 py-2 text-xs text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          r.factura
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {r.factura ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{r.gestor_nombre}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {r.estado}
                        </span>
                      </td>
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
