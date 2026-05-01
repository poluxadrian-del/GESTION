-- =====================================================
-- Trigger: Cambiar estado a liquidado cuando saldo <= 0
-- =====================================================

-- Función: Cambiar estado a liquidado si saldo <= 0
CREATE OR REPLACE FUNCTION cambiar_estado_liquidado()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular saldo actual
  IF (NEW.precio_venta - NEW.descuento - NEW.total_pagado) <= 0 THEN
    -- Si saldo es <= 0, cambiar estado a liquidado
    NEW.estado := 'liquidado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Antes de actualizar clientes, verificar si debe ser liquidado
CREATE TRIGGER trg_cliente_liquidado_antes_actualizar
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION cambiar_estado_liquidado();

-- También aplicar a inserts (por si acaso se crea un cliente con saldo <= 0)
CREATE TRIGGER trg_cliente_liquidado_antes_insertar
BEFORE INSERT ON clientes
FOR EACH ROW
EXECUTE FUNCTION cambiar_estado_liquidado();
