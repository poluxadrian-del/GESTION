/**
 * Manejo centralizado de errores de Supabase
 */

export const handleSupabaseError = (error: any): string => {
  // Errores de validación de BD
  if (error?.code === '23505') {
    return 'Este registro ya existe. Verifica los datos e intenta nuevamente.';
  }
  if (error?.code === '23503') {
    return 'Referencia inválida. Verifica que los datos relacionados existan.';
  }

  // Errores de permisos
  if (error?.code === '42501' || error?.status === 403) {
    return 'Acceso denegado. No tienes permiso para realizar esta acción.';
  }

  // Errores de red
  if (error?.message?.includes('network') || error?.message?.includes('Failed to fetch')) {
    return 'Error de conexión. Por favor, verifica tu conexión a internet.';
  }

  // Errores generales
  if (error?.message) {
    return error.message;
  }

  return 'Ocurrió un error inesperado. Por favor, intenta nuevamente.';
};

/**
 * Wrapper para reintentar automáticamente
 */
export const retryAsync = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1s antes de reintentar
      }
    }
  }

  throw lastError;
};
