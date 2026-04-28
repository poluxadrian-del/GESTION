import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { CalendarioPago, PagoRealizado } from '@/types';

export const usePagos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // FUNCIONES: Nueva estructura (calendarios_pagos + pagos_realizados)
  // ✅ Tabla vieja "pagos" ha sido eliminada
  // =====================================================

  /**
   * Obtener calendario de pagos (cuotas programadas) para un cliente
   */
  const obtenerCalendarioPagos = useCallback(async (clienteId: string): Promise<CalendarioPago[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('calendarios_pagos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('numero_cuota', { ascending: true });

      if (err) throw err;
      return data || [];
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener resumen consolidado de pagos para un cliente (desde vista materializada)
   */
  /**
   * Obtener resumen consolidado de un cliente
   * Calcula desde calendarios_pagos y pagos_realizados (sin vistas)
   */
  const obtenerResumenCliente = useCallback(async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener todas las cuotas programadas
      const { data: calendarios, error: errCalendarios } = await supabase
        .from('calendarios_pagos')
        .select('*')
        .eq('cliente_id', clienteId);

      if (errCalendarios) throw errCalendarios;

      // Obtener todos los pagos realizados
      const { data: pagosRealizados, error: errPagos } = await supabase
        .from('pagos_realizados')
        .select('monto_pagado')
        .eq('cliente_id', clienteId)
        .gt('monto_pagado', 0); // Excluir pagos reversados (monto = 0)

      if (errPagos) throw errPagos;

      // Calcular métricas
      const totalProgramado = (calendarios || []).reduce((sum, cal) => sum + (cal.monto_programado || 0), 0);
      const totalSaldoPendiente = (calendarios || []).reduce((sum, cal) => sum + (cal.saldo_pendiente || 0), 0);
      const cuotasPagadas = (calendarios || []).filter(cal => cal.estado === 'pagado').length;
      const totalCuotasProgramadas = calendarios?.length || 0;
      const totalPagadoRealizado = (pagosRealizados || []).reduce((sum, pago) => sum + (pago.monto_pagado || 0), 0);

      return {
        cliente_id: clienteId,
        total_programado: totalProgramado,
        total_pagado_realizado: totalPagadoRealizado,
        total_saldo_pendiente: totalSaldoPendiente,
        cuotas_pagadas: cuotasPagadas,
        total_cuotas_programadas: totalCuotasProgramadas,
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener pagos realizados de un cliente
   */
  /**
   * Obtener pagos realizados de un cliente CON INFORMACIÓN DEL GESTOR
   * Ordena por fecha más reciente primero
   */
  const obtenerPagosRealizados = useCallback(async (clienteId: string): Promise<PagoRealizado[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('pagos_realizados')
        .select(`
          *,
          gestor:gestor_id (
            id,
            nombre
          )
        `)
        .eq('cliente_id', clienteId)
        .order('fecha_pago', { ascending: false });

      if (err) throw err;
      return data || [];
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registrar un pago realizado (MONTO FLEXIBLE)
   * 
   * Los TRIGGERS automáticamente:
   * ⚡ Actualizan clientes.total_pagado (+= monto_pagado)
   * ⚡ Actualizan calendarios_pagos.saldo_pendiente (-= monto_pagado)
   * ⚡ Actualizan calendarios_pagos.estado (pendiente → parcialmente_pagado → pagado)
   * ⚡ Aplican pago a siguientes cuotas si hay exceso (FIFO)
   * 
   * NO HAGAS CÁLCULOS MANUALES - los triggers manejan todo
   */
  const registrarPagoRealizado = useCallback(async (
    clienteId: string,
    input: {
      fecha_pago: string;
      monto_pagado: number;
      gestor_id?: string;
      notas?: string;
    }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('pagos_realizados')
        .insert([{
          cliente_id: clienteId,
          fecha_pago: input.fecha_pago,
          monto_pagado: input.monto_pagado,
          gestor_id: input.gestor_id || null,
          notas: input.notas || null,
        }])
        .select()
        .single();

      if (err) throw err;
      
      // Los triggers del servidor hacen el resto automáticamente
      toast.success(`Pago de $${input.monto_pagado.toFixed(2)} registrado exitosamente`);
      return true;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Editar un pago realizado
   * ⚡ Los triggers recalculan automáticamente todo
   */
  const editarPagoRealizado = useCallback(async (
    pagoId: string,
    input: {
      fecha_pago?: string;
      monto_pagado?: number;
      gestor_id?: string;
      notas?: string;
    }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('pagos_realizados')
        .update(input)
        .eq('id', pagoId)
        .select()
        .single();

      if (err) throw err;

      toast.success('Pago actualizado exitosamente');
      return true;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reversar un pago realizado (marca como eliminado sin borrar)
   * ⚡ Los triggers recalculan automáticamente todo
   */
  const reversarPagoRealizado = useCallback(async (pagoId: string, motivo: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('pagos_realizados')
        .update({
          monto_pagado: 0,
          motivo_eliminacion: motivo,
          fecha_eliminacion: new Date().toISOString()
        })
        .eq('id', pagoId);

      if (err) throw err;

      toast.success('Pago reversado exitosamente');
      return true;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar fecha programada de una cuota
   */
  const actualizarFechaProgramada = useCallback(async (
    calendarioPagoId: string,
    nuevaFecha: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('calendarios_pagos')
        .update({ fecha_programada: nuevaFecha })
        .eq('id', calendarioPagoId);

      if (err) throw err;
      return true;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar múltiples fechas programadas
   */
  const actualizarMultiplesFechas = useCallback(async (
    actualizaciones: Array<{ calendarioPagoId: string; nuevaFecha: string }>
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Actualizar cada cuota
      for (const actualizacion of actualizaciones) {
        const { error: err } = await supabase
          .from('calendarios_pagos')
          .update({ fecha_programada: actualizacion.nuevaFecha })
          .eq('id', actualizacion.calendarioPagoId);

        if (err) throw err;
      }
      
      toast.success('Fechas actualizadas exitosamente');
      return true;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener cuotas pendientes/parcialmente pagadas AL DÍA (fecha_programada <= hoy)
   * Compatible con CobranzaPage
   */
  const obtenerPagosPendientes = useCallback(async (
    page: number = 1,
    pageSize: number = 50,
    filters: any = {}
  ): Promise<{ data: any[]; total: number; totalPages: number }> => {
    setLoading(true);
    setError(null);

    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('calendarios_pagos')
        .select(`
          *,
          clientes (
            id,
            nombre_completo,
            numero_contrato,
            gestor_id,
            total_pagado,
            gestor:gestor_id (
              id,
              nombre
            )
          )
        `, { count: 'exact' })
        .in('estado', ['pendiente', 'parcialmente_pagado'])
        .order('fecha_programada', { ascending: true });

      // Filtro por rango de fechas - si no hay filtros, mostrar solo AL DÍA (fecha <= hoy)
      if (filters.fechaDesde) {
        query = query.gte('fecha_programada', filters.fechaDesde);
      } else if (!filters.fechaHasta) {
        // Si no hay filtro de fechas, solo mostrar pendientes al día (fecha <= hoy)
        query = query.lte('fecha_programada', hoy);
      }

      if (filters.fechaHasta) {
        query = query.lte('fecha_programada', filters.fechaHasta);
      }

      const { data, count, error: err } = await query;

      if (err) throw err;

      let filteredData = data || [];

      // Filtrar por cliente en memoria (Supabase no permite .or() en relaciones anidadas)
      if (filters.cliente) {
        const clienteFilter = filters.cliente.toLowerCase();
        filteredData = filteredData.filter((item: any) => {
          const nombre = (item.clientes?.nombre_completo || '').toLowerCase();
          const contrato = (item.clientes?.numero_contrato || '').toLowerCase();
          return nombre.includes(clienteFilter) || contrato.includes(clienteFilter);
        });
      }

      // Filtrar por gestor en memoria
      if (filters.gestor) {
        filteredData = filteredData.filter((item: any) => 
          item.clientes?.gestor?.id === filters.gestor || item.clientes?.gestor?.nombre === filters.gestor
        );
      }

      // Aplicar paginación en memoria después de filtrar
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedData = filteredData.slice(from, to);

      return {
        data: paginatedData,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / pageSize),
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return { data: [], total: 0, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener cartera vencida (cuotas con fecha programada < hoy)
   */
  const obtenerCarteraVencida = useCallback(async (
    page: number = 1,
    pageSize: number = 50,
    filters: any = {}
  ): Promise<{ data: any[]; total: number; totalPages: number }> => {
    setLoading(true);
    setError(null);

    try {
      const hoy = new Date();
      const hayUnMes = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let query = supabase
        .from('calendarios_pagos')
        .select(`
          *,
          clientes (
            id,
            nombre_completo,
            numero_contrato,
            gestor_id,
            total_pagado,
            gestor:gestor_id (
              id,
              nombre
            )
          )
        `, { count: 'exact' })
        .eq('estado', 'pendiente')
        .lt('fecha_programada', hayUnMes)
        .order('fecha_programada', { ascending: true });

      const { data, count, error: err } = await query;

      if (err) throw err;

      let filteredData = data || [];

      // Filtrar por gestor en memoria
      if (filters.gestor) {
        filteredData = filteredData.filter((item: any) => 
          item.clientes?.gestor?.id === filters.gestor || item.clientes?.gestor?.nombre === filters.gestor
        );
      }

      // Agrupar por cliente_id
      const clientesMap = new Map<string, any>();
      filteredData.forEach((item: any) => {
        const clienteId = item.cliente_id;
        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            id: item.id,
            cliente_id: clienteId,
            clientes: item.clientes,
            numero_cuota: item.numero_cuota,
            fecha_programada: item.fecha_programada,
            monto_programado: item.monto_programado,
            saldo_pendiente: item.saldo_pendiente,
            estado: item.estado,
            totalVencido: item.saldo_pendiente || item.monto_programado,
            totalCuotas: 1,
            cuotasVencidas: [item],
          });
        } else {
          const cliente = clientesMap.get(clienteId);
          cliente.totalVencido += item.saldo_pendiente || item.monto_programado;
          cliente.totalCuotas += 1;
          cliente.cuotasVencidas.push(item);
        }
      });

      const groupedData = Array.from(clientesMap.values());

      // Aplicar paginación en memoria después de filtrar
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const paginatedData = groupedData.slice(from, to);

      return {
        data: paginatedData,
        total: groupedData.length,
        totalPages: Math.ceil(groupedData.length / pageSize),
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return { data: [], total: 0, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Obtener datos del dashboard (mes actual)
   * Calcula desde tablas sin vistas
   */
  const obtenerDashboardMesActual = useCallback(async (): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      // Obtener todos los clientes activos
      const { data: clientesData, error: err } = await supabase
        .from('clientes')
        .select('id, gestor_id, nombre_completo, estado');

      if (err) throw err;

      const clientesActivos = clientesData?.filter((c: any) => c.estado === 'activo') || [];

      // Obtener todos los calendarios de los clientes activos
      const clientesActivosIds = clientesActivos.map((c: any) => c.id);
      
      const { data: calendarios, error: errCalendarios } = await supabase
        .from('calendarios_pagos')
        .select('cliente_id, saldo_pendiente, estado')
        .in('cliente_id', clientesActivosIds);

      if (errCalendarios) throw errCalendarios;

      // Obtener gestores
      const { data: gestoresData, error: gestoresErr } = await supabase
        .from('gestores')
        .select('id, nombre');

      if (gestoresErr) throw gestoresErr;

      // Procesar datos
      const totalClientesActivos = clientesActivos.length;

      // Agrupar por gestor
      const clientesPorGestorMap = new Map<string, any>();
      
      gestoresData?.forEach((gestor: any) => {
        clientesPorGestorMap.set(gestor.id, {
          gestorId: gestor.id,
          gestor: {
            id: gestor.id,
            nombre: gestor.nombre,
          },
          totalClientes: 0,
          clientesCobrados: 0,
          porcentajeCobrado: 0,
        });
      });

      // Calcular clientes por gestor
      clientesActivos.forEach((cliente: any) => {
        if (!clientesPorGestorMap.has(cliente.gestor_id)) {
          clientesPorGestorMap.set(cliente.gestor_id, {
            gestorId: cliente.gestor_id,
            gestor: { id: cliente.gestor_id, nombre: 'Sin asignar' },
            totalClientes: 0,
            clientesCobrados: 0,
            porcentajeCobrado: 0,
          });
        }
        
        const datosGestor = clientesPorGestorMap.get(cliente.gestor_id)!;
        datosGestor.totalClientes += 1;

        // Verificar si el cliente está completamente cobrado
        const cuotasDelCliente = calendarios?.filter((cal: any) => cal.cliente_id === cliente.id) || [];
        const totalSaldoPendiente = cuotasDelCliente.reduce((sum: number, cal: any) => sum + (cal.saldo_pendiente || 0), 0);

        if (totalSaldoPendiente === 0) {
          datosGestor.clientesCobrados += 1;
        }

        datosGestor.porcentajeCobrado = datosGestor.totalClientes > 0 
          ? (datosGestor.clientesCobrados / datosGestor.totalClientes) * 100 
          : 0;
      });

      const clientesPorGestor = Array.from(clientesPorGestorMap.values());

      return {
        totalClientesActivos,
        clientesPorGestor,
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Registrar un pago (función de compatibilidad con código antiguo)
   * Usa la nueva estructura internamente
   */
  const registrarPago = useCallback(async (
    clienteId: string,
    input: {
      fecha_pago: string;
      monto_pagado: number;
      gestor_id?: string;
      notas?: string;
    }
  ): Promise<boolean> => {
    return registrarPagoRealizado(clienteId, input);
  }, [registrarPagoRealizado]);

  /**
   * Obtener clientes con pagos al día o vencidos
   * Retorna: número de clientes, total vencido, y datos por gestor
   */
  const obtenerClientesPendientesAlDia = useCallback(async (): Promise<{
    totalClientesConPendientes: number;
    totalVencido: number;
    totalClientes: number;
    porGestor: Array<{
      gestorId: string;
      gestorNombre: string;
      clientesConPendientes: number;
      totalClientesGestor: number;
      totalVencidoGestor: number;
    }>;
  } | null> => {
    setLoading(true);
    setError(null);

    try {
      const hoy = new Date().toISOString().split('T')[0];

      // Obtener cuotas al día o vencidas (fecha_programada <= hoy)
      const { data: cuotasAlDia, error: errCuotas } = await supabase
        .from('calendarios_pagos')
        .select('id, cliente_id, saldo_pendiente, estado, clientes(id, nombre_completo, gestor_id, estado, gestor:gestor_id(id, nombre))')
        .in('estado', ['pendiente', 'parcialmente_pagado'])
        .lte('fecha_programada', hoy);

      if (errCuotas) throw errCuotas;

      // Obtener todos los gestores
      const { data: gestoresData, error: gestoresErr } = await supabase
        .from('gestores')
        .select('id, nombre');

      if (gestoresErr) throw gestoresErr;

      // Procesar datos
      const clientesConPendientes = new Set<string>();
      let totalVencido = 0;

      const datosPorGestor = new Map<string, {
        gestorId: string;
        gestorNombre: string;
        clientesConPendientes: Set<string>;
        totalVencido: number;
        totalClientesGestor: number;
      }>();

      // Inicializar datos por gestor
      gestoresData?.forEach((gestor: any) => {
        datosPorGestor.set(gestor.id, {
          gestorId: gestor.id,
          gestorNombre: gestor.nombre,
          clientesConPendientes: new Set(),
          totalVencido: 0,
          totalClientesGestor: 0,
        });
      });

      // Procesar cuotas al día
      cuotasAlDia?.forEach((cuota: any) => {
        const cliente = (cuota.clientes as any);
        if (cliente && cliente.estado === 'activo') {
          const clienteId = cliente.id;
          const gestorId = cliente.gestor_id;

          clientesConPendientes.add(clienteId);
          totalVencido += cuota.saldo_pendiente || 0;

          if (gestorId && datosPorGestor.has(gestorId)) {
            const datosGestor = datosPorGestor.get(gestorId)!;
            datosGestor.clientesConPendientes.add(clienteId);
            datosGestor.totalVencido += cuota.saldo_pendiente || 0;
          }
        }
      });

      // Obtener total de clientes activos por gestor
      const { data: todosClientes, error: errTodos } = await supabase
        .from('clientes')
        .select('id, gestor_id, estado');

      if (errTodos) throw errTodos;

      todosClientes?.forEach((cliente: any) => {
        if (cliente.estado === 'activo' && cliente.gestor_id) {
          const datosGestor = datosPorGestor.get(cliente.gestor_id);
          if (datosGestor) {
            datosGestor.totalClientesGestor += 1;
          }
        }
      });

      const porGestor = Array.from(datosPorGestor.values()).map(d => ({
        gestorId: d.gestorId,
        gestorNombre: d.gestorNombre,
        clientesConPendientes: d.clientesConPendientes.size,
        totalClientesGestor: d.totalClientesGestor,
        totalVencidoGestor: d.totalVencido,
      }));

      const totalClientes = todosClientes?.filter((c: any) => c.estado === 'activo').length || 0;

      return {
        totalClientesConPendientes: clientesConPendientes.size,
        totalVencido,
        totalClientes,
        porGestor,
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Editar un pago (función de compatibilidad con código antiguo)
   * Usa la nueva estructura internamente
   */
  const editarPago = useCallback(async (
    pagoId: string,
    input: any
  ): Promise<boolean> => {
    return editarPagoRealizado(pagoId, input);
  }, [editarPagoRealizado]);

  return {
    loading,
    error,
    // Funciones principales
    obtenerCalendarioPagos,
    obtenerResumenCliente,
    obtenerPagosRealizados,
    registrarPagoRealizado,
    editarPagoRealizado,
    reversarPagoRealizado,
    // Funciones adicionales para reestructuración y reportes
    actualizarFechaProgramada,
    actualizarMultiplesFechas,
    obtenerPagosPendientes,
    obtenerCarteraVencida,
    obtenerDashboardMesActual,
    obtenerClientesPendientesAlDia,
    // Funciones de compatibilidad con código antiguo
    registrarPago,
    editarPago,
  };
};
