-- =====================================================
-- Agregar auth_id a tabla usuarios para RLS
-- =====================================================

-- Agregar columna auth_id como FK a auth.users
ALTER TABLE usuarios
ADD COLUMN auth_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- Crear índice para mejor performance
CREATE INDEX idx_usuarios_auth_id ON usuarios(auth_id);

-- =====================================================
-- Actualizar RLS policies con auth_id
-- =====================================================

-- Eliminar políticas viejas que usaban id directamente
DROP POLICY IF EXISTS "usuarios_view_all" ON usuarios;

-- Nueva política que usa auth_id
CREATE POLICY "usuarios_view_own" ON usuarios
  FOR SELECT
  USING (auth.uid() = auth_id);

CREATE POLICY "usuarios_socio_admin_view_all" ON usuarios
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE auth_id = auth.uid()) IN ('socio', 'admin')
  );
