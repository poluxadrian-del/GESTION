import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

export interface ClienteConComision {
  id: string;
  nombre_completo: string;
  numero_contrato: string;
  vendedor?: string;
  total_pagado: number;
  comision: boolean;
  notas?: string;
  gestor?: {
    id: string;
    nombre: string;
  };
  pagos_info?: {
    primer_pago_fecha: string;
    total_pagado_real: number;
  };
}

export const useComisiones = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener clientes que han pagado al menos una cuota y NO tienen comisión marcada
   */
  const obtenerClientesSinComision = useCallback(async (): Promise<ClienteConComision[]> => {
    setLoading(true);
    setError(null);

    try {
      // Obtener todos los clientes activos sin comisión
      const { data: clientes, error: errClientes } = await supabase
        .from('clientes')
        .select(`
          id,
          nombre_completo,
          numero_contrato,
          vendedor,
          total_pagado,
          comision,
          notas,
          gestor:gestor_id (
            id,
            nombre
          )
        `)
        .eq('estado', 'activo')
        .eq('comision', false)
        .order('nombre_completo', { ascending: true });

      if (errClientes) throw errClientes;

      if (!clientes || clientes.length === 0) {
        setLoading(false);
        return [];
      }

      // Obtener IDs de clientes
      const clienteIds = clientes.map(c => c.id);

      // Obtener TODOS los pagos realizados de estos clientes en UNA sola consulta
      const { data: todosPagos, error: errPagos } = await supabase
        .from('pagos_realizados')
        .select('cliente_id, fecha_pago, monto_pagado')
        .in('cliente_id', clienteIds)
        .gt('monto_pagado', 0)
        .order('fecha_pago', { ascending: true });

      if (errPagos) throw errPagos;

      // Agrupar pagos por cliente y obtener el primero de cada uno
      const primerPagoPorCliente = new Map<string, { fecha_pago: string; monto_pagado: number }>();
      todosPagos?.forEach(pago => {
        if (!primerPagoPorCliente.has(pago.cliente_id)) {
          primerPagoPorCliente.set(pago.cliente_id, {
            fecha_pago: pago.fecha_pago,
            monto_pagado: pago.monto_pagado,
          });
        }
      });

      // Construir resultado final
      const clientesConInfo: ClienteConComision[] = clientes
        .filter(cliente => primerPagoPorCliente.has(cliente.id))
        .map(cliente => {
          const pago = primerPagoPorCliente.get(cliente.id)!;
          const gestorNormalizado = Array.isArray(cliente.gestor) 
            ? cliente.gestor[0]
            : cliente.gestor;
          
          return {
            id: cliente.id,
            nombre_completo: cliente.nombre_completo,
            numero_contrato: cliente.numero_contrato,
            vendedor: cliente.vendedor,
            total_pagado: cliente.total_pagado,
            comision: cliente.comision,
            notas: cliente.notas,
            gestor: gestorNormalizado,
            pagos_info: {
              primer_pago_fecha: pago.fecha_pago,
              total_pagado_real: pago.monto_pagado,
            },
          };
        });

      return clientesConInfo;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marcar un cliente como pagado de comisión
   */
  const marcarComisionPagada = useCallback(async (clienteId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('clientes')
        .update({ comision: true })
        .eq('id', clienteId);

      if (err) throw err;

      toast.success('Comisión marcada como pagada');
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
   * Desmarcar comisión pagada (por si fue error)
   */
  const desmarcarComisionPagada = useCallback(async (clienteId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('clientes')
        .update({ comision: false })
        .eq('id', clienteId);

      if (err) throw err;

      toast.success('Comisión desmarcada');
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
   * Marcar todos los clientes como comisión pagada
   */
  const marcarTodosComisonPagada = useCallback(async (clienteIds: string[]): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (clienteIds.length === 0) {
        toast.error('No hay clientes para marcar');
        return false;
      }

      // Actualizar todos los clientes en una sola consulta
      const { error: err } = await supabase
        .from('clientes')
        .update({ comision: true })
        .in('id', clienteIds);

      if (err) throw err;

      toast.success(`${clienteIds.length} comisiones marcadas como pagadas`);
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
    obtenerClientesSinComision,
    marcarComisionPagada,
    desmarcarComisionPagada,
    marcarTodosComisonPagada,
    loading,
    error,
  };
};
