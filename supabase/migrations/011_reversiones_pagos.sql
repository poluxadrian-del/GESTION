-- =====================================================
-- Migración: Agregar campo de reversiones de pagos
-- En lugar de eliminar pagos, marcarlos como reversados
-- =====================================================

-- Agregar columnas a pagos_realizados
ALTER TABLE pagos_realizados ADD COLUMN IF NOT EXISTS motivo_eliminacion text NULL;
ALTER TABLE pagos_realizados ADD COLUMN IF NOT EXISTS fecha_eliminacion timestamptz NULL;

-- Crear índice para facilitar búsquedas
CREATE INDEX IF NOT EXISTS idx_pagos_realizados_motivo ON pagos_realizados(motivo_eliminacion);

-- Comentario para documentación
COMMENT ON COLUMN pagos_realizados.motivo_eliminacion IS 'Si no es NULL, el pago fue reversado por este motivo';
COMMENT ON COLUMN pagos_realizados.fecha_eliminacion IS 'Fecha/hora cuando se reversó el pago';
