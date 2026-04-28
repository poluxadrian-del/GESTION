-- =====================================================
-- Migración: Eliminar tabla "pagos" antigua
-- Propósito: Limpiar BD después de migración a calendarios_pagos + pagos_realizados
-- =====================================================

-- PASO 1: Crear respaldo (OPTIONAL - comentado)
-- CREATE TABLE pagos_backup_20260427 AS SELECT * FROM pagos;

-- PASO 2: Eliminar tabla y sus dependencias
-- Usar CASCADE para eliminar también cualquier trigger/constraint/index asociado
DROP TABLE IF EXISTS pagos CASCADE;

-- RESULTADO: Tabla "pagos" antigua ha sido eliminada
-- La nueva estructura (calendarios_pagos + pagos_realizados) es ahora la única fuente de verdad

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- ✅ Confirmado que NINGÚN código TypeScript usa tabla "pagos" vieja
-- ✅ Hook usePagos.ts ha sido limpiado (solo funciones nuevas)
-- ✅ Componente CalendarioPagos.tsx antiguo ha sido eliminado
-- ✅ CalendarioPagos.v2.tsx renombrado a CalendarioPagos.tsx
-- ✅ Frontend compiled sin errores
-- =====================================================
