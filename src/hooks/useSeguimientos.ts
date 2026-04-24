import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { SeguimientoFormInput } from '@/validations/seguimiento';

export const useSeguimientos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerSeguimientosPorCliente = useCallback(async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('seguimientos')
        .select('*, usuario:usuarios(id, nombre_completo)')
        .eq('cliente_id', clienteId)
        .order('fecha_contacto', { ascending: false });

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

  const crearSeguimiento = useCallback(async (clienteId: string, usuarioId: string, data: SeguimientoFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: seguimiento, error: err } = await supabase
        .from('seguimientos')
        .insert([{
          cliente_id: clienteId,
          usuario_id: usuarioId,
          ...data,
        }])
        .select()
        .single();

      if (err) throw err;

      toast.success('Seguimiento registrado exitosamente');
      return seguimiento;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const editarSeguimiento = useCallback(async (seguimientoId: string, data: SeguimientoFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: seguimiento, error: err } = await supabase
        .from('seguimientos')
        .update(data)
        .eq('id', seguimientoId)
        .select()
        .single();

      if (err) throw err;

      toast.success('Seguimiento actualizado exitosamente');
      return seguimiento;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerUltimoSeguimientoPorCliente = useCallback(async (clienteId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('seguimientos')
        .select('*, usuario:usuarios(id, nombre_completo)')
        .eq('cliente_id', clienteId)
        .order('fecha_contacto', { ascending: false })
        .limit(1)
        .single();

      if (err && err.code !== 'PGRST116') throw err; // PGRST116 = no rows found

      return data || null;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    obtenerSeguimientosPorCliente,
    obtenerUltimoSeguimientoPorCliente,
    crearSeguimiento,
    editarSeguimiento,
    loading,
    error,
  };
};
