-- =====================================================
-- Eliminar constraint que limitaba mensualidades a 2-18
-- =====================================================

ALTER TABLE clientes 
DROP CONSTRAINT clientes_mensualidades_check;
