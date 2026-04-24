import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';
import type { Usuario } from '@/types';

interface AuthState {
  usuario: Usuario | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  loading: true,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      // Obtener datos del usuario desde la tabla usuarios
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        throw new Error('No se encontraron datos del usuario');
      }

      set({ usuario: userData, loading: false });
    } catch (error) {
      const message = handleSupabaseError(error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ usuario: null, loading: false, error: null });
    } catch (error) {
      const message = handleSupabaseError(error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  getCurrentUser: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ usuario: null, loading: false });
        return;
      }

      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        throw new Error('No se encontraron datos del usuario');
      }

      set({ usuario: userData, loading: false });
    } catch (error) {
      const message = handleSupabaseError(error);
      set({ error: message, loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
