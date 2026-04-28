import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import { generarCalendarioPagos } from '@/utils/businessLogic';

export const useClientes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerClientes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('clientes')
        .select('*, gestor:gestores(id, nombre)')
        .order('created_at', { ascending: false });

      if (err) throw err;

      return data || [];
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerClientePorId = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('clientes')
        .select('*, gestor:gestores(id, nombre)')
        .eq('id', id)
        .single();

      if (err) throw err;

      return data;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearCliente = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Hook crearCliente - datos entrada:', data)
      
      // Extraer dia_pago_2 temporal (solo para generar calendario, no se guarda en BD)
      // const diaPago2Temporal = data._diaPago2Temporal;
      
      // Calcular numero_pagos (para generar calendario)
      const numero_pagos = data.frecuencia_pago === 'quincenal'
        ? data.mensualidades * 2
        : data.mensualidades;

      // Calcular monto_pago
      const saldo = data.precio_venta;
      const monto_pago = saldo / numero_pagos;

      // Si no hay fecha_primer_pago, usar fecha_inicio
      const fecha_primer_pago = data.fecha_primer_pago || data.fecha_inicio;

      // Generar numero_contrato automáticamente si no viene en los datos
      let numero_contrato = data.numero_contrato;
      if (!numero_contrato) {
        const año = new Date().getFullYear().toString();
        
        // Obtener el último número de contrato del año
        const { data: ultimoContrato, error: countError } = await supabase
          .from('clientes')
          .select('numero_contrato')
          .like('numero_contrato', `CLI-${año}-%`)
          .order('numero_contrato', { ascending: false })
          .limit(1)
          .single();
        
        let consecutivo = 1;
        if (!countError && ultimoContrato?.numero_contrato) {
          // Extraer el número del último contrato y incrementar
          const ultimoNum = parseInt(ultimoContrato.numero_contrato.split('-')[2]) || 0;
          consecutivo = ultimoNum + 1;
        }
        
        numero_contrato = `CLI-${año}-${String(consecutivo).padStart(4, '0')}`;
      }

      // Solo insertar campos que existen en la tabla clientes (sin _diaPago2Temporal)
      const clienteData = {
        ...data,
        numero_contrato,
        fecha_primer_pago,
        monto_pago,
        estado: 'inicio',
        // Asegurar que gestor_id sea null si viene vacío (para evitar error de UUID)
        gestor_id: data.gestor_id && data.gestor_id.trim() ? data.gestor_id : null,
      };
      
      // Remover el campo temporal antes de insertar en BD
      delete clienteData._diaPago2Temporal;
      // Remover numero_pagos si viene en los datos (no existe en la tabla)
      delete clienteData.numero_pagos;
      
      // Normalizar strings vacíos a null para evitar errores de tipo
      Object.keys(clienteData).forEach(key => {
        if (clienteData[key] === '') {
          clienteData[key] = null;
        }
      });

      console.log('Hook crearCliente - datos a insertar:', clienteData)

      const { data: cliente, error: err } = await supabase
        .from('clientes')
        .insert([clienteData])
        .select()
        .single();

      if (err) {
        console.error('Error Supabase al crear cliente:', err)
        throw err
      }

      console.log('Cliente creado exitosamente:', cliente)
      toast.success('Cliente creado exitosamente. Ahora genera el calendario de pagos.');
      return cliente;
    } catch (err) {
      console.error('Error en crearCliente:', err)
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarCliente = useCallback(async (id: string, updates: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Hook actualizarCliente - id:', id, 'updates:', updates)

      // Obtener el cliente anterior para comparar el gestor_id
      const { data: clienteAnterior, error: errAnterior } = await supabase
        .from('clientes')
        .select('gestor_id')
        .eq('id', id)
        .single();

      if (errAnterior) throw errAnterior;

      // Limpiar campos que no existen en la tabla
      const cleanUpdates = { ...updates };
      delete cleanUpdates.numero_pagos;
      delete cleanUpdates._diaPago2Temporal;
      
      // Validar gestor_id: si es un string vacío, convertir a null
      if (cleanUpdates.gestor_id !== undefined && !cleanUpdates.gestor_id) {
        cleanUpdates.gestor_id = null;
      }
      
      // Validar otros campos UUID/strings vacíos
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === '') {
          cleanUpdates[key] = null;
        }
      });

      const { data: cliente, error: err } = await supabase
        .from('clientes')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (err) {
        console.error('Error Supabase al actualizar cliente:', err)
        throw err
      }

      // Si el gestor_id cambió, actualizar los pagos realizados pendientes
      if (clienteAnterior.gestor_id !== cliente.gestor_id) {
        console.log('Gestor cambió de', clienteAnterior.gestor_id, 'a', cliente.gestor_id);
        // Nota: Los calendarios_pagos no tienen gestor_id (es atributo del cliente)
        // Solo se actualiza en pagos_realizados futuros al registrar nuevos pagos
      }

      console.log('Cliente actualizado exitosamente:', cliente)
      toast.success('Cliente actualizado exitosamente');
      return cliente;
    } catch (err) {
      console.error('Error en actualizarCliente:', err)
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const eliminarCliente = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (err) throw err;

      toast.success('Cliente eliminado exitosamente');
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

  const generarCalendarioPagosCliente = useCallback(async (clienteId: string, diaPago2?: number) => {
    setLoading(true);
    setError(null);

    try {
      // Obtener el cliente actual
      const { data: cliente, error: clienteErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteErr) throw clienteErr;

      console.log('Cliente obtenido para generar calendario:', cliente)

      // Usar fecha_primer_pago si existe, si no usar fecha_inicio
      const fechaPrimerPago = cliente.fecha_primer_pago || cliente.fecha_inicio;

      // Calcular numero_pagos basándose en mensualidades y frecuencia_pago
      const numeroPagos = cliente.frecuencia_pago === 'quincenal'
        ? cliente.mensualidades * 2
        : cliente.mensualidades;

      console.log('Parámetros de generación:', { 
        frecuencia: cliente.frecuencia_pago, 
        mensualidades: cliente.mensualidades, 
        numeroPagos 
      })

      // Preparar datos para generar calendario
      const clienteConFecha = {
        ...cliente,
        fecha_primer_pago: fechaPrimerPago,
        numero_pagos: numeroPagos,
        monto_pago: cliente.monto_pago,
        _diaPago2Temporal: diaPago2, // Incluir el valor temporal si se proporciona
      };

      console.log('Generando calendario para cliente:', clienteId, 'numero_pagos:', numeroPagos)

      // Generar calendario de pagos
      const calendarios = generarCalendarioPagos(clienteConFecha);
      console.log('Calendarios generados:', calendarios.length, 'cuotas', calendarios)

      if (calendarios.length === 0) {
        throw new Error('No se pudieron generar los calendarios de pagos');
      }

      // Insertar calendarios de pagos
      const { error: errCalendarios } = await supabase
        .from('calendarios_pagos')
        .insert(calendarios);

      if (errCalendarios) {
        console.error('Error Supabase al crear calendarios:', errCalendarios)
        throw errCalendarios
      }

      console.log('Pagos insertados correctamente. Actualizando estado del cliente...')

      // Actualizar solo el estado del cliente a 'activo'
      const { data: clienteActualizado, error: updateErr } = await supabase
        .from('clientes')
        .update({ estado: 'activo' })
        .eq('id', clienteId)
        .select()
        .single();

      if (updateErr) {
        console.error('Error al actualizar estado:', updateErr)
        throw updateErr
      }

      console.log('Cliente actualizado a activo:', clienteActualizado)
      toast.success('Calendario de pagos generado exitosamente');
      return true;
    } catch (err) {
      console.error('Error en generarCalendarioPagosCliente:', err)
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    obtenerClientes,
    obtenerClientePorId,
    crearCliente,
    actualizarCliente,
    eliminarCliente,
    generarCalendarioPagosCliente,
    loading,
    error,
  };
};
