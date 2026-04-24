-- =====================================================
-- Remover restricción unique en (cliente_id, numero_pago)
-- Permite múltiples pagos con el mismo numero_pago
-- =====================================================

ALTER TABLE pagos DROP CONSTRAINT pagos_cliente_id_numero_pago_key;

