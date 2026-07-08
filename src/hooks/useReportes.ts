import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

export interface ReporteCobranza {
  fecha_pago: string;
  cliente_nombre: string;
  gestor_nombre: string;
  monto_pagado: number;
  numero_pago: number;
  numero_contrato: string;
  estado_cliente: string;
  email: string;
  total_pagado: number;
  notas: string;
}

export interface ReportePagosCobrar {
  cliente_nombre: string;
  numero_pago: number;
  fecha_programada: string;
  fecha_pago: string | null;
  monto_programado: number;
  monto_pagado: number;
  telefono_celular: string;
  email: string;
  gestor_nombre: string;
  cargo: string;
}

export interface ReporteClientes {
  id: string;
  numero_contrato: string;
  nombre_completo: string;
  telefono_celular: string;
  email: string;
  fecha_inicio: string;
  precio_venta: number;
  total_pagado: number;
  saldo: number;
  mensualidades: number;
  vendedor: string;
  estado: string;
  gestor_nombre: string;
}

export const useReportes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerReporteCobranza = useCallback(async (
    fechaDesde?: string,
    fechaHasta?: string,
    gestorId?: string,
    factura?: boolean,
    estadoCliente?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('pagos_realizados')
          .select('fecha_pago, monto_pagado, cliente_id, gestor_id, cliente:cliente_id(nombre_completo, numero_contrato, factura, estado, email, total_pagado, notas), gestor:gestor_id(nombre)')
          .not('fecha_pago', 'is', null)
          .order('fecha_pago', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fechaDesde) {
          query = query.gte('fecha_pago', fechaDesde);
        }

        if (fechaHasta) {
          query = query.lte('fecha_pago', fechaHasta);
        }

        if (gestorId) {
          query = query.eq('gestor_id', gestorId);
        }

        const { data, error: err } = await query;

        if (err) throw err;

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          }
          page++;
        }
      }

      // Filtrar por factura y estado del cliente en el lado del cliente
      let reporteData = allData;
      if (factura !== undefined) {
        reporteData = reporteData.filter(p => {
          const clienteFactura = (p.cliente as any)?.factura;
          return clienteFactura === factura;
        });
      }
      if (estadoCliente) {
        reporteData = reporteData.filter(p => {
          const clienteEstado = (p.cliente as any)?.estado;
          return clienteEstado === estadoCliente;
        });
      }

      // Transformar a formato reporte
      const reporte: ReporteCobranza[] = reporteData.map((p, index) => ({
        numero_pago: index + 1,
        fecha_pago: p.fecha_pago || '',
        cliente_nombre: (p.cliente as any)?.nombre_completo || 'Sin cliente',
        gestor_nombre: (p.gestor as any)?.nombre || '-',
        monto_pagado: p.monto_pagado || 0,
        numero_contrato: (p.cliente as any)?.numero_contrato || '',
        estado_cliente: (p.cliente as any)?.estado || '',
        email: (p.cliente as any)?.email || '',
        total_pagado: (p.cliente as any)?.total_pagado || 0,
        notas: (p.cliente as any)?.notas || '',
      }));

      return reporte;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerReportePagosCobrar = useCallback(async (
    fechaDesde?: string,
    fechaHasta?: string,
    gestorId?: string,
    estadoPago?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      let allData: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('calendarios_pagos')
          .select('numero_cuota, fecha_programada, monto_programado, saldo_pendiente, estado, cliente_id, cliente:cliente_id(nombre_completo, factura, estado, telefono_celular, email, cargo, gestor_id, gestor:gestor_id(nombre))')
          .order('fecha_programada', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (fechaDesde) {
          query = query.gte('fecha_programada', fechaDesde);
        }

        if (fechaHasta) {
          query = query.lte('fecha_programada', fechaHasta);
        }

        if (estadoPago) {
          query = query.eq('estado', estadoPago);
        }

        if (gestorId) {
          query = query.eq('cliente.gestor_id', gestorId);
        }

        const { data, error: err } = await query;

        if (err) throw err;

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          }
          page++;
        }
      }

      // Obtener fecha de pago más reciente por cliente
      const { data: pagosRealizados, error: errPagos } = await supabase
        .from('pagos_realizados')
        .select('cliente_id, fecha_pago')
        .order('fecha_pago', { ascending: false });

      if (errPagos) throw errPagos;

      // Crear mapa de cliente_id -> fecha_pago más reciente
      const fechaPorCliente = new Map<string, string>();
      (pagosRealizados || []).forEach((p: any) => {
        if (!fechaPorCliente.has(p.cliente_id)) {
          fechaPorCliente.set(p.cliente_id, p.fecha_pago);
        }
      });

      // Filtrar por cliente activo en el lado del cliente
      let reporteData = allData.filter(p => {
        const cliente = (p.cliente as any);
        return cliente && cliente.estado === 'activo';
      });

      // Transformar a formato reporte
      const reporte: ReportePagosCobrar[] = reporteData.map(p => ({
        cliente_nombre: (p.cliente as any)?.nombre_completo || 'Sin cliente',
        numero_pago: (p as any).numero_cuota,
        fecha_programada: p.fecha_programada,
        fecha_pago: p.estado === 'pagado' ? (fechaPorCliente.get(p.cliente_id) || '') : '',
        monto_programado: p.monto_programado || 0,
        monto_pagado: p.monto_programado - (p.saldo_pendiente || 0),
        telefono_celular: (p.cliente as any)?.telefono_celular || '-',
        email: (p.cliente as any)?.email || '-',
        gestor_nombre: (p.cliente as any)?.gestor?.nombre || '-',
        cargo: (p.cliente as any)?.cargo || '-',
      }));

      return reporte;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener reporte de clientes con filtros por fecha de inicio y gestor
   */
  const obtenerReporteClientes = useCallback(async (
    fechaDesde?: string,
    fechaHasta?: string,
    gestorId?: string
  ): Promise<ReporteClientes[]> => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('clientes')
        .select(`
          id,
          numero_contrato,
          nombre_completo,
          telefono_celular,
          email,
          fecha_inicio,
          precio_venta,
          total_pagado,
          saldo,
          mensualidades,
          vendedor,
          estado,
          gestor:gestor_id (
            id,
            nombre
          )
        `)
        .order('fecha_inicio', { ascending: false });

      if (fechaDesde) {
        query = query.gte('fecha_inicio', fechaDesde);
      }

      if (fechaHasta) {
        query = query.lte('fecha_inicio', fechaHasta);
      }

      if (gestorId) {
        query = query.eq('gestor_id', gestorId);
      }

      const { data, error: err } = await query;

      if (err) throw err;

      // Transformar a formato reporte
      const reporte: ReporteClientes[] = (data || []).map(cliente => {
        const gestorNormalizado = Array.isArray(cliente.gestor)
          ? cliente.gestor[0]
          : cliente.gestor;

        return {
          id: cliente.id,
          numero_contrato: cliente.numero_contrato,
          nombre_completo: cliente.nombre_completo,
          telefono_celular: cliente.telefono_celular || '-',
          email: cliente.email || '-',
          fecha_inicio: cliente.fecha_inicio,
          precio_venta: cliente.precio_venta || 0,
          total_pagado: cliente.total_pagado || 0,
          saldo: cliente.saldo || 0,
          mensualidades: cliente.mensualidades || 0,
          vendedor: cliente.vendedor || '-',
          estado: cliente.estado,
          gestor_nombre: gestorNormalizado?.nombre || '-',
        };
      });

      return reporte;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    obtenerReporteCobranza,
    obtenerReportePagosCobrar,
    obtenerReporteClientes,
  };
};
