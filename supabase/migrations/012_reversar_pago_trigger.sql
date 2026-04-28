-- =====================================================
-- Migración: Trigger para reversiones de pagos
-- Cuando se reversa un pago, recalcula calendarios_pagos
-- =====================================================

-- Función: Recalcular todos los calendarios de un cliente desde cero
CREATE OR REPLACE FUNCTION recalcular_calendario_cliente(p_cliente_id uuid)
RETURNS void AS $$
DECLARE
  monto_restante numeric;
  cuota_actual record;
  pago_registro record;
BEGIN
  -- Resetear todos los calendarios a pendiente
  UPDATE calendarios_pagos
  SET 
    saldo_pendiente = monto_programado,
    estado = 'pendiente',
    updated_at = now()
  WHERE cliente_id = p_cliente_id;
  
  -- Procesar cada pago realizado (excluyendo reversados) en orden FIFO
  FOR pago_registro IN
    SELECT monto_pagado
    FROM pagos_realizados
    WHERE cliente_id = p_cliente_id
      AND monto_pagado > 0  -- Ignorar pagos reversados
    ORDER BY fecha_pago ASC, created_at ASC
  LOOP
    monto_restante := pago_registro.monto_pagado;
    
    -- Aplicar este pago a cuotas pendientes en orden
    FOR cuota_actual IN
      SELECT id, saldo_pendiente
      FROM calendarios_pagos
      WHERE cliente_id = p_cliente_id
        AND estado IN ('pendiente', 'parcialmente_pagado')
      ORDER BY numero_cuota ASC
    LOOP
      EXIT WHEN monto_restante <= 0;
      
      -- Aplicar monto a esta cuota
      UPDATE calendarios_pagos
      SET 
        saldo_pendiente = GREATEST(0, cuota_actual.saldo_pendiente - monto_restante),
        estado = CASE
          WHEN (cuota_actual.saldo_pendiente - monto_restante) <= 0 THEN 'pagado'
          ELSE 'parcialmente_pagado'
        END,
        updated_at = now()
      WHERE id = cuota_actual.id;
      
      monto_restante := monto_restante - cuota_actual.saldo_pendiente;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Función: Trigger para manejar reversiones
CREATE OR REPLACE FUNCTION reversar_pago()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una reversión (monto_pagado = 0 y motivo_eliminacion != NULL)
  IF NEW.monto_pagado = 0 AND NEW.motivo_eliminacion IS NOT NULL THEN
    -- Recalcular todos los calendarios de este cliente
    PERFORM recalcular_calendario_cliente(NEW.cliente_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: UPDATE en pagos_realizados para reversiones
CREATE TRIGGER trg_pagos_realizados_reversar
AFTER UPDATE ON pagos_realizados
FOR EACH ROW
WHEN (NEW.monto_pagado = 0 AND NEW.motivo_eliminacion IS NOT NULL AND OLD.monto_pagado > 0)
EXECUTE FUNCTION reversar_pago();
