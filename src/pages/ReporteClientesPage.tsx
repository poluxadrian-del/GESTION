import { useState, useEffect } from 'react';
import { Download, Filter, X } from 'lucide-react';
import { useReportes, type ReporteClientes } from '@/hooks/useReportes';
import { useGestores } from '@/hooks/useGestores';
import { useAuthStore } from '@/store/authStore';
import { exportarExcel } from '@/utils/exportExcel';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Gestor } from '@/types';

export default function ReporteClientesPage() {
  const { usuario } = useAuthStore();
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [reporteClientes, setReporteClientes] = useState<ReporteClientes[]>([]);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [gestorSeleccionado, setGestorSeleccionado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { loading, obtenerReporteClientes } = useReportes();
  const { obtenerGestores } = useGestores();

  // Cargar gestores al montar
  useEffect(() => {
    const loadGestores = async () => {
      const data = await obtenerGestores(true);
      setGestores(data);
    };
    loadGestores();
  }, [obtenerGestores]);

  // Cargar reporte cuando cambian filtros
  useEffect(() => {
    loadReporte();
  }, [fechaDesde, fechaHasta, gestorSeleccionado]);

  const loadReporte = async () => {
    const data = await obtenerReporteClientes(
      fechaDesde || undefined,
      fechaHasta || undefined,
      gestorSeleccionado || undefined
    );
    setReporteClientes(data);
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setGestorSeleccionado('');
    setSearchTerm('');
  };

  // Filtrar por búsqueda
  const clientesFiltrados = reporteClientes.filter(cliente =>
    cliente.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.numero_contrato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefono_celular.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const descargarReporte = () => {
    const datosFormato = clientesFiltrados.map(c => ({
      'Contrato': c.numero_contrato,
      'Cliente': c.nombre_completo,
      'Celular': c.telefono_celular,
      'Email': c.email,
      'Gestor': c.gestor_nombre,
      'Vendedor': c.vendedor,
      'Fecha Inicio': c.fecha_inicio,
      'Precio Venta': formatCurrency(c.precio_venta),
      'Total Pagado': formatCurrency(c.total_pagado),
      'Saldo': formatCurrency(c.saldo),
      'Mensualidades': c.mensualidades,
      'Estado': c.estado,
    }));
    exportarExcel(datosFormato, 'Reporte_Clientes', 'Clientes');
  };

  const totalPrecioVenta = clientesFiltrados.reduce((sum, c) => sum + c.precio_venta, 0);
  const totalPagado = clientesFiltrados.reduce((sum, c) => sum + c.total_pagado, 0);
  const totalSaldo = clientesFiltrados.reduce((sum, c) => sum + c.saldo, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reporte de Clientes</h1>
        <span className="text-sm text-gray-600">
          {usuario?.rol === 'socio' && '👥 Socio'} 
          {usuario?.rol === 'admin' && '⚙️ Administrador'}
        </span>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Filter size={18} />
            Filtros
          </h2>
          {(fechaDesde || fechaHasta || gestorSeleccionado) && (
            <button
              onClick={limpiarFiltros}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <X size={14} />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gestor
            </label>
            <select
              value={gestorSeleccionado}
              onChange={(e) => setGestorSeleccionado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los gestores</option>
              {gestores.map(gestor => (
                <option key={gestor.id} value={gestor.id}>
                  {gestor.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Cliente, contrato, celular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Clientes</p>
          <p className="text-2xl font-bold text-gray-900">{clientesFiltrados.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Precio Venta Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrecioVenta)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Pagado</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Saldo</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSaldo)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Clientes</h3>
          <button
            onClick={descargarReporte}
            disabled={clientesFiltrados.length === 0 || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
          >
            <Download size={16} />
            Descargar Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Contrato</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Cliente</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Celular</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Email</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Gestor</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Vendedor</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Fecha Inicio</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-900">Precio Venta</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-900">Total Pagado</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-900">Saldo</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-900">Meses</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-900">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-gray-500">
                    No hay clientes que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map(cliente => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-900">{cliente.numero_contrato}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{cliente.nombre_completo}</td>
                    <td className="px-3 py-2 text-gray-600">{cliente.telefono_celular}</td>
                    <td className="px-3 py-2 text-gray-600 truncate" title={cliente.email}>{cliente.email}</td>
                    <td className="px-3 py-2 text-gray-600">{cliente.gestor_nombre}</td>
                    <td className="px-3 py-2 text-gray-600">{cliente.vendedor}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(cliente.fecha_inicio)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      {formatCurrency(cliente.precio_venta)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-600">
                      {formatCurrency(cliente.total_pagado)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600">
                      {formatCurrency(cliente.saldo)}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{cliente.mensualidades}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        cliente.estado === 'activo' 
                          ? 'bg-green-100 text-green-800'
                          : cliente.estado === 'liquidado'
                          ? 'bg-blue-100 text-blue-800'
                          : cliente.estado === 'pausa'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cliente.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
