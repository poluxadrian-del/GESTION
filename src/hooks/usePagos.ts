import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { RegistrarPagoInput } from '@/validations/pago';

export const usePagos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerPagosPorCliente = useCallback(async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('pagos')
        .select('*, cliente:clientes(id, nombre_completo, numero_contrato), gestor:gestores(id, nombre)')
        .eq('cliente_id', clienteId)
        .order('fecha_programada', { ascending: true })
        .order('numero_pago', { ascending: true });

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

  const registrarPago = useCallback(async (pagoId: string, clienteId: string, input: RegistrarPagoInput) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener el cliente actual
      const { data: cliente, error: clienteErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteErr) throw clienteErr;

      // 2. Obtener el pago actual
      const { data: pagoCurrent, error: pagoCurrentErr } = await supabase
        .from('pagos')
        .select('*')
        .eq('id', pagoId)
        .single();

      if (pagoCurrentErr) throw pagoCurrentErr;

      // 3. Verificar si es un pago parcial (menor que el monto programado)
      const esPagoParcial = input.monto_pagado < pagoCurrent.monto_programado;

      if (esPagoParcial) {
        // CASO: Pago Parcial
        // 3a. Actualizar el pago registrado (NO cambiar monto_programado)
        const { error: updatePagoErr } = await supabase
          .from('pagos')
          .update({
            monto_pagado: input.monto_pagado,
            fecha_pago: input.fecha_pago,
            estado: 'pagado',
            gestor_id: input.gestor_id,
            notas: input.notas,
          })
          .eq('id', pagoId);

        if (updatePagoErr) throw updatePagoErr;

        // 3b. Crear nuevo pago con UUID único y fecha programada +1 día
        const fechaProgramadaOriginal = new Date(pagoCurrent.fecha_programada);
        const fechaProgramadaNueva = new Date(fechaProgramadaOriginal);
        fechaProgramadaNueva.setDate(fechaProgramadaNueva.getDate() + 1);
        const fechaProgramadaNuevaStr = fechaProgramadaNueva.toISOString().split('T')[0];

        const { error: insertErr } = await supabase
          .from('pagos')
          .insert({
            id: uuidv4(),
            cliente_id: clienteId,
            numero_pago: pagoCurrent.numero_pago,
            fecha_programada: fechaProgramadaNuevaStr,
            monto_programado: 0,
            monto_pagado: 0,
            estado: 'pendiente',
            gestor_id: input.gestor_id,
          });

        if (insertErr) throw insertErr;

        // 3c. Recalcular total_pagado del cliente
        const { data: todosPagos, error: pagosFetchErr } = await supabase
          .from('pagos')
          .select('monto_pagado, estado')
          .eq('cliente_id', clienteId)
          .eq('estado', 'pagado');

        if (pagosFetchErr) throw pagosFetchErr;

        const totalPagadoCalculado = (todosPagos || []).reduce((sum, pago) => sum + (pago.monto_pagado || 0), 0);

        // 3d. Determinar nuevo estado y actualizar cliente
        const saldoCalculado = cliente.precio_venta - cliente.descuento - totalPagadoCalculado;
        const nuevoEstado = saldoCalculado <= 0 ? 'liquidado' : cliente.estado;

        const { error: updateClienteErr } = await supabase
          .from('clientes')
          .update({
            total_pagado: totalPagadoCalculado,
            estado: nuevoEstado,
          })
          .eq('id', clienteId);

        if (updateClienteErr) throw updateClienteErr;
      } else {
        // CASO: Pago Total o Exceso
        // 3. Actualizar el pago registrado
        const { error: updatePagoErr } = await supabase
          .from('pagos')
          .update({
            monto_pagado: input.monto_pagado,
            fecha_pago: input.fecha_pago,
            estado: 'pagado',
            gestor_id: input.gestor_id,
            notas: input.notas,
          })
          .eq('id', pagoId);

        if (updatePagoErr) throw updatePagoErr;

        // 4. Obtener TODOS los pagos del cliente para recalcular el total_pagado
        const { data: todosPagos, error: pagosFetchErr } = await supabase
          .from('pagos')
          .select('monto_pagado, estado')
          .eq('cliente_id', clienteId)
          .eq('estado', 'pagado');

        if (pagosFetchErr) throw pagosFetchErr;

        // 5. Sumar todos los montos_pagados
        const totalPagadoCalculado = (todosPagos || []).reduce((sum, pago) => sum + (pago.monto_pagado || 0), 0);

        // 6. Determinar nuevo estado y calcular cuotas pagadas
        const saldoCalculado = cliente.precio_venta - cliente.descuento - totalPagadoCalculado;
        const nuevoEstado = saldoCalculado <= 0 ? 'liquidado' : cliente.estado;
        const cuotasPagadas = cliente.monto_pago > 0 ? Math.floor(totalPagadoCalculado / cliente.monto_pago) : 0;

        // 7. Actualizar cliente
        const { error: updateClienteErr } = await supabase
          .from('clientes')
          .update({
            total_pagado: totalPagadoCalculado,
            estado: nuevoEstado,
          })
          .eq('id', clienteId);

        if (updateClienteErr) throw updateClienteErr;

        // 8. Obtener todos los pagos del cliente ordenados por número de cuota
        const { data: todosLosPagos, error: todosErr } = await supabase
          .from('pagos')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('numero_pago', { ascending: true });

        if (todosErr) throw todosErr;

        // 9. Marcar como pagadas las cuotas según cuotasPagadas
        const pagosAMarcar = (todosLosPagos || []).filter(p => 
          p.numero_pago <= cuotasPagadas && p.estado !== 'pagado'
        );

        for (const pago of pagosAMarcar) {
          const { error: updateErr } = await supabase
            .from('pagos')
            .update({
              monto_pagado: 0,
              fecha_pago: input.fecha_pago,
              estado: 'pagado',
            })
            .eq('id', pago.id);

          if (updateErr) throw updateErr;
        }
      }

      toast.success('Pago registrado exitosamente');
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

  const editarPago = useCallback(async (pagoId: string, clienteId: string, input: any) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Obtener el cliente actual
      const { data: cliente, error: clienteErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteErr) throw clienteErr;

      // 2. Construir el texto de notas con el motivo del cambio
      const notasActualizadas = input.motivo_cambio 
        ? `[EDICIÓN] Motivo: ${input.motivo_cambio}${input.notas ? '\n\n' + input.notas : ''}`
        : input.notas;

      // 3. Actualizar el pago con los nuevos datos
      const { error: updatePagoErr } = await supabase
        .from('pagos')
        .update({
          monto_pagado: input.monto_pagado,
          fecha_pago: input.fecha_pago,
          gestor_id: input.gestor_id,
          notas: notasActualizadas,
        })
        .eq('id', pagoId);

      if (updatePagoErr) throw updatePagoErr;

      // 4. Obtener TODOS los pagos del cliente para recalcular el total_pagado
      const { data: todosPagos, error: pagosFetchErr } = await supabase
        .from('pagos')
        .select('monto_pagado, estado')
        .eq('cliente_id', clienteId)
        .eq('estado', 'pagado');

      if (pagosFetchErr) throw pagosFetchErr;

      // 5. Sumar todos los montos_pagados de los pagos con estado 'pagado'
      const totalPagadoCalculado = (todosPagos || []).reduce((sum, pago) => sum + (pago.monto_pagado || 0), 0);

      // 6. Determinar nuevo estado
      const saldoCalculado = cliente.precio_venta - cliente.descuento - totalPagadoCalculado;
      const nuevoEstado = saldoCalculado <= 0 ? 'liquidado' : cliente.estado;

      // 7. Actualizar cliente con el total_pagado recalculado
      const { error: updateClienteErr } = await supabase
        .from('clientes')
        .update({
          total_pagado: totalPagadoCalculado,
          estado: nuevoEstado,
        })
        .eq('id', clienteId);

      if (updateClienteErr) throw updateClienteErr;

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

  const obtenerPagosPendientes = useCallback(async (
    page: number = 1,
    pageSize: number = 50,
    filtros?: {
      cliente?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      gestor?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('pagos')
        .select('*, cliente:clientes(id, nombre_completo, numero_contrato, telefono_celular, saldo, estado), gestor:gestores(id, nombre)', { count: 'exact' })
        .eq('estado', 'pendiente')
        .eq('cliente.estado', 'activo')
        .lte('fecha_programada', today);

      // Aplicar filtros que funcionan bien en BD
      if (filtros?.fechaDesde) {
        query = query.gte('fecha_programada', filtros.fechaDesde);
      }
      
      if (filtros?.fechaHasta) {
        query = query.lte('fecha_programada', filtros.fechaHasta);
      }

      // Obtener todos los datos con filtros de fecha
      const { data: allData, error: err } = await query
        .order('fecha_programada', { ascending: true })
        .order('numero_pago', { ascending: true });

      if (err) throw err;

      // Filtrar cliente y gestor en el lado del cliente (más confiable)
      let filteredData = allData || [];
      
      if (filtros?.cliente) {
        const clienteFilter = filtros.cliente.toLowerCase();
        filteredData = filteredData.filter(p => 
          (p.cliente as any)?.nombre_completo?.toLowerCase().includes(clienteFilter)
        );
      }

      if (filtros?.gestor) {
        const gestorFilter = filtros.gestor.toLowerCase();
        filteredData = filteredData.filter(p => 
          (p.gestor as any)?.nombre?.toLowerCase().includes(gestorFilter)
        );
      }

      // Aplicar paginación después del filtro
      const offset = (page - 1) * pageSize;
      const paginatedData = filteredData.slice(offset, offset + pageSize);
      const totalAfterFilter = filteredData.length;

      return {
        data: paginatedData,
        total: totalAfterFilter,
        page,
        pageSize,
        totalPages: Math.ceil(totalAfterFilter / pageSize)
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerCarteraVencida = useCallback(async (
    page: number = 1,
    pageSize: number = 50,
    filtros?: {
      gestor?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Calcular fecha de hace 30 días
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Obtener pagos pendientes con fecha programada hace más de 30 días
      const { data: pagos, error: err } = await supabase
        .from('pagos')
        .select('*, cliente:clientes(id, nombre_completo, numero_contrato, telefono_celular, saldo, estado), gestor:gestores(id, nombre)')
        .eq('estado', 'pendiente')
        .eq('cliente.estado', 'activo')
        .lte('fecha_programada', thirtyDaysAgo)
        .order('fecha_programada', { ascending: true })
        .order('numero_pago', { ascending: true });

      if (err) throw err;

      // Agrupar por cliente y obtener el pago más antiguo de cada uno
      const carteraAgrupada = new Map();

      (pagos || []).forEach(pago => {
        const clienteId = (pago.cliente as any)?.id;
        if (clienteId) {
          if (!carteraAgrupada.has(clienteId)) {
            carteraAgrupada.set(clienteId, pago);
          }
        }
      });

      let result = Array.from(carteraAgrupada.values());

      // Filtrar por gestor en el lado del cliente
      if (filtros?.gestor) {
        const gestorFilter = filtros.gestor.toLowerCase();
        result = result.filter(p => 
          (p.gestor as any)?.nombre?.toLowerCase().includes(gestorFilter)
        );
      }

      // Aplicar paginación
      const offset = (page - 1) * pageSize;
      const paginatedData = result.slice(offset, offset + pageSize);

      return {
        data: paginatedData,
        total: result.length,
        page,
        pageSize,
        totalPages: Math.ceil(result.length / pageSize)
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerResumenCobranza = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: pagos, error: err } = await supabase
        .from('pagos')
        .select('*');

      if (err) throw err;

      const totalPagado = pagos?.reduce((sum, p) => sum + (p.monto_pagado || 0), 0) || 0;
      const totalPendiente = pagos?.reduce((sum, p) => p.estado === 'pendiente' ? sum + p.monto_programado : sum, 0) || 0;
      const totalVencido = pagos?.reduce((sum, p) => p.estado === 'vencido' ? sum + p.monto_programado : sum, 0) || 0;
      const totalPagos = pagos?.length || 0;
      const pagosPagados = pagos?.filter(p => p.estado === 'pagado').length || 0;
      const pagosPendientes = pagos?.filter(p => p.estado === 'pendiente').length || 0;
      const pagosVencidos = pagos?.filter(p => p.estado === 'vencido').length || 0;

      return {
        totalPagado,
        totalPendiente,
        totalVencido,
        totalPagos,
        pagosPagados,
        pagosPendientes,
        pagosVencidos,
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarGestorPagosPendientes = useCallback(async (clienteId: string, nuevoGestorId: string) => {
    try {
      // Actualizar solo los pagos pendientes del cliente con el nuevo gestor_id
      const { error: err } = await supabase
        .from('pagos')
        .update({ gestor_id: nuevoGestorId })
        .eq('cliente_id', clienteId)
        .eq('estado', 'pendiente');

      if (err) throw err;

      return true;
    } catch (err) {
      console.error('Error al actualizar gestor en pagos pendientes:', err);
      return false;
    }
  }, []);

  // ==================== DASHBOARD ====================
  const obtenerDashboardMesActual = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const hoy = new Date();
      const hoyStr = hoy.toISOString().split('T')[0];

      // 1. Obtener todos los pagos con fecha_programada <= hoy que NO han sido cobrados
      const { data: pagosVencidos, error: pagosErr } = await supabase
        .from('pagos')
        .select('id, cliente_id, gestor_id, fecha_programada, estado, cliente:clientes(id, nombre_completo, gestor_id, gestor:gestores(id, nombre))')
        .lte('fecha_programada', hoyStr)
        .neq('estado', 'pagado');

      if (pagosErr) throw pagosErr;

      // 2. Obtener todos los gestores para referencias
      const { data: gestores, error: gestoresErr } = await supabase
        .from('gestores')
        .select('id, nombre');

      if (gestoresErr) throw gestoresErr;

      // Procesar datos para el dashboard
      // Crear un Set de clientes únicos con pagos vencidos
      const clientesConPagosVencidos = new Set<string>();
      
      // Map para agrupar por gestor
      const clientesPorGestorMap: Record<string, {
        gestor: any;
        clientesVencidos: Set<string>;
      }> = {};

      // Inicializar gestores
      (gestores || []).forEach(gestor => {
        clientesPorGestorMap[gestor.id] = {
          gestor: gestor,
          clientesVencidos: new Set(),
        };
      });

      // Procesar pagos vencidos
      (pagosVencidos || []).forEach(pago => {
        clientesConPagosVencidos.add(pago.cliente_id);
        
        const gestorId = pago.gestor_id;
        if (gestorId) {
          if (!clientesPorGestorMap[gestorId]) {
            clientesPorGestorMap[gestorId] = {
              gestor: { id: gestorId, nombre: 'Desconocido' },
              clientesVencidos: new Set(),
            };
          }
          clientesPorGestorMap[gestorId].clientesVencidos.add(pago.cliente_id);
        }
      });

      // Convertir a array
      const datosPorGestor = Object.entries(clientesPorGestorMap)
        .filter(([_, datos]) => datos.clientesVencidos.size > 0) // Solo gestores con clientes vencidos
        .map(([gestorId, datos]) => ({
          gestorId,
          gestor: datos.gestor,
          totalClientes: datos.clientesVencidos.size,
          clientesCobrados: 0, // Ya no es relevante pero lo mantenemos para compatibilidad
          porcentajeCobrado: 0, // Ya no es relevante
        }))
        .sort((a, b) => b.totalClientes - a.totalClientes); // Ordenar por cantidad de clientes vencidos

      return {
        totalClientesActivos: clientesConPagosVencidos.size,
        clientesPorGestor: datosPorGestor,
      };
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return {
        totalClientesActivos: 0,
        clientesPorGestor: [],
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarFechaProgramada = useCallback(async (pagoId: string, nuevaFecha: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('pagos')
        .update({
          fecha_programada: nuevaFecha,
        })
        .eq('id', pagoId);

      if (updateErr) throw updateErr;

      toast.success('Fecha programada actualizada exitosamente');
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

  const actualizarMultiplesFechas = useCallback(async (
    actualizaciones: Array<{ pagoId: string; nuevaFecha: string }>
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Actualizar cada pago
      for (const { pagoId, nuevaFecha } of actualizaciones) {
        const { error: updateErr } = await supabase
          .from('pagos')
          .update({
            fecha_programada: nuevaFecha,
          })
          .eq('id', pagoId);

        if (updateErr) throw updateErr;
      }

      toast.success(`${actualizaciones.length} fechas actualizadas exitosamente`);
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

  return {
    obtenerPagosPorCliente,
    registrarPago,
    editarPago,
    actualizarFechaProgramada,
    actualizarMultiplesFechas,
    obtenerPagosPendientes,
    obtenerCarteraVencida,
    obtenerResumenCobranza,
    actualizarGestorPagosPendientes,
    obtenerDashboardMesActual,
    loading,
    error,
  };
};
