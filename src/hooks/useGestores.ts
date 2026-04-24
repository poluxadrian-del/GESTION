import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { GestorFormInput } from '@/validations/gestor';

export const useGestores = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obtenerGestores = useCallback(async (soloActivos = true) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('gestores')
        .select('*')
        .order('nombre', { ascending: true });

      if (soloActivos) {
        query = query.eq('activo', true);
      }

      const { data, error: err } = await query;

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

  const obtenerGestor = useCallback(async (id: string, soloActivos = true) => {
    try {
      let query = supabase
        .from('gestores')
        .select('*')
        .eq('id', id);

      if (soloActivos) {
        query = query.eq('activo', true);
      }

      const { data, error: err } = await query.single();

      if (err) throw err;

      return data || null;
    } catch (err) {
      return null;
    }
  }, []);

  const crearGestor = useCallback(async (data: GestorFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const { data: gestor, error: err } = await supabase
        .from('gestores')
        .insert([{ ...data, activo: true }])
        .select()
        .single();

      if (err) throw err;

      toast.success('Gestor creado exitosamente');
      return gestor;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarGestor = useCallback(async (id: string, data: Partial<GestorFormInput>) => {
    setLoading(true);
    setError(null);

    try {
      const { data: gestor, error: err } = await supabase
        .from('gestores')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;

      toast.success('Gestor actualizado exitosamente');
      return gestor;
    } catch (err) {
      const message = handleSupabaseError(err);
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const eliminarGestor = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from('gestores')
        .delete()
        .eq('id', id);

      if (err) throw err;

      toast.success('Gestor eliminado exitosamente');
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
    obtenerGestores,
    obtenerGestor,
    crearGestor,
    actualizarGestor,
    eliminarGestor,
    loading,
    error,
  };
};
