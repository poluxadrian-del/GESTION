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
}

export interface ReportePagosCobrar {
  cliente_nombre: string;
  numero_pago: number;
  fecha_programada: string;
  fecha_pago: string | null;
  monto_programado: number;
  monto_pagado: number;
  factura: boolean;
  gestor_nombre: string;
  estado: string;
}

export const useReportes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerReporteCobranza = useCallback(async (
    fechaDesde?: string,
    fechaHasta?: string,
    gestorId?: string,
    factura?: boolean
  ) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('pagos')
        .select('fecha_pago, monto_pagado, numero_pago, cliente_id, gestor_id, cliente:cliente_id(nombre_completo, numero_contrato, factura), gestor:gestor_id(nombre)')
        .eq('estado', 'pagado')
        .not('fecha_pago', 'is', null)
        .order('fecha_pago', { ascending: true });

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

      // Filtrar por factura en el lado del cliente si se especifica
      let reporteData = (data || []);
      if (factura !== undefined) {
        reporteData = reporteData.filter(p => {
          const clienteFactura = (p.cliente as any)?.factura;
          return clienteFactura === factura;
        });
      }

      // Transformar a formato reporte
      const reporte: ReporteCobranza[] = reporteData.map(p => ({
        fecha_pago: p.fecha_pago || '',
        cliente_nombre: (p.cliente as any)?.nombre_completo || 'Sin cliente',
        gestor_nombre: (p.gestor as any)?.nombre || '-',
        monto_pagado: p.monto_pagado || 0,
        numero_pago: p.numero_pago,
        numero_contrato: (p.cliente as any)?.numero_contrato || '',
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
      let query = supabase
        .from('pagos')
        .select('numero_pago, fecha_programada, fecha_pago, monto_programado, monto_pagado, estado, cliente_id, gestor_id, cliente:cliente_id(nombre_completo, factura, estado), gestor:gestor_id(nombre)')
        .order('fecha_programada', { ascending: true });

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
        query = query.eq('gestor_id', gestorId);
      }

      const { data, error: err } = await query;

      if (err) throw err;

      // Filtrar por cliente activo en el lado del cliente
      let reporteData = (data || []).filter(p => {
        const cliente = (p.cliente as any);
        return cliente && cliente.estado === 'activo';
      });

      // Transformar a formato reporte
      const reporte: ReportePagosCobrar[] = reporteData.map(p => ({
        cliente_nombre: (p.cliente as any)?.nombre_completo || 'Sin cliente',
        numero_pago: p.numero_pago,
        fecha_programada: p.fecha_programada,
        fecha_pago: p.fecha_pago || '',
        monto_programado: p.monto_programado || 0,
        monto_pagado: p.monto_pagado || 0,
        factura: (p.cliente as any)?.factura || false,
        gestor_nombre: (p.gestor as any)?.nombre || '-',
        estado: p.estado,
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

  return {
    loading,
    error,
    obtenerReporteCobranza,
    obtenerReportePagosCobrar,
  };
};
