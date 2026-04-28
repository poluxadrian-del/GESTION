-- =====================================================
-- Migración: Nueva Estructura de Pagos
-- Separa calendario de pagos (cuándo cobrar) de pagos realizados (registro)
-- =====================================================

-- =====================================================
-- TABLA: calendarios_pagos
-- Propósito: Plan de cobro - Qué días se deben cobrar
-- Relación: Cada cliente → múltiples cuotas programadas
-- =====================================================
CREATE TABLE calendarios_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificación de la cuota
  numero_cuota integer NOT NULL,  -- 1, 2, 3... (secuencial)
  
  -- Fecha y monto de la cuota
  fecha_programada date NOT NULL,  -- Cuándo se debe cobrar
  monto_programado numeric(15,2) NOT NULL,  -- Monto esperado
  
  -- Control de pago
  estado varchar(20) NOT NULL DEFAULT 'pendiente',  -- pendiente, parcialmente_pagado, pagado
  saldo_pendiente numeric(15,2) NOT NULL,  -- monto_programado - lo pagado
  
  -- Auditoría
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(cliente_id, numero_cuota),
  CHECK (saldo_pendiente >= 0),
  CHECK (saldo_pendiente <= monto_programado)
);

-- =====================================================
-- TABLA: pagos_realizados
-- Propósito: Registro de todos los pagos efectuados
-- Relación: Cada cliente → múltiples pagos realizados
-- =====================================================
CREATE TABLE pagos_realizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id uuid REFERENCES gestores(id) ON DELETE SET NULL,
  
  -- Pago realizado
  fecha_pago date NOT NULL,
  monto_pagado numeric(15,2) NOT NULL,
  
  -- Auditoría
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- ÍNDICES para performance
-- =====================================================
CREATE INDEX idx_calendarios_pagos_cliente ON calendarios_pagos(cliente_id);
CREATE INDEX idx_calendarios_pagos_fecha ON calendarios_pagos(fecha_programada);
CREATE INDEX idx_calendarios_pagos_estado ON calendarios_pagos(estado);

CREATE INDEX idx_pagos_realizados_cliente ON pagos_realizados(cliente_id);
CREATE INDEX idx_pagos_realizados_fecha ON pagos_realizados(fecha_pago);
CREATE INDEX idx_pagos_realizados_gestor ON pagos_realizados(gestor_id);

-- =====================================================
-- VISTA: Resumen de pagos por cliente
-- Útil para dashboards y reportes
-- =====================================================
CREATE OR REPLACE VIEW v_resumen_pagos_cliente AS
SELECT 
  c.id as cliente_id,
  c.numero_contrato,
  c.nombre_completo,
  -- Calendario programado
  COUNT(DISTINCT cp.id) as total_cuotas_programadas,
  SUM(CASE WHEN cp.estado = 'pendiente' THEN 1 ELSE 0 END) as cuotas_pendientes,
  SUM(CASE WHEN cp.estado = 'parcialmente_pagado' THEN 1 ELSE 0 END) as cuotas_parciales,
  SUM(CASE WHEN cp.estado = 'pagado' THEN 1 ELSE 0 END) as cuotas_pagadas,
  SUM(cp.monto_programado) as total_programado,
  SUM(cp.saldo_pendiente) as total_saldo_pendiente,
  -- Pagos realizados
  COUNT(DISTINCT pr.id) as total_pagos_realizados,
  SUM(pr.monto_pagado) as total_pagado_realizado,
  -- Diferencia
  COALESCE(SUM(cp.monto_programado), 0) - COALESCE(SUM(pr.monto_pagado), 0) as diferencia_pendiente
FROM clientes c
LEFT JOIN calendarios_pagos cp ON c.id = cp.cliente_id
LEFT JOIN pagos_realizados pr ON c.id = pr.cliente_id
GROUP BY c.id, c.numero_contrato, c.nombre_completo;

-- =====================================================
-- TRIGGERS: Sincronizar total_pagado en clientes
-- =====================================================

-- Función: Actualizar total_pagado al insertar un pago
CREATE OR REPLACE FUNCTION actualizar_total_pagado_insertar()
RETURNS TRIGGER AS $$
BEGIN
  -- Aumentar total_pagado del cliente
  UPDATE clientes
  SET total_pagado = total_pagado + NEW.monto_pagado,
      updated_at = now()
  WHERE id = NEW.cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar total_pagado al editar un pago
CREATE OR REPLACE FUNCTION actualizar_total_pagado_actualizar()
RETURNS TRIGGER AS $$
DECLARE
  diferencia numeric;
BEGIN
  -- Calcular la diferencia (nuevo - viejo)
  diferencia := NEW.monto_pagado - OLD.monto_pagado;
  
  -- Ajustar total_pagado del cliente
  UPDATE clientes
  SET total_pagado = total_pagado + diferencia,
      updated_at = now()
  WHERE id = NEW.cliente_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Actualizar total_pagado al eliminar un pago
CREATE OR REPLACE FUNCTION actualizar_total_pagado_eliminar()
RETURNS TRIGGER AS $$
BEGIN
  -- Restar el monto pagado del total
  UPDATE clientes
  SET total_pagado = total_pagado - OLD.monto_pagado,
      updated_at = now()
  WHERE id = OLD.cliente_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger: INSERT en pagos_realizados
CREATE TRIGGER trg_pagos_realizados_insert
AFTER INSERT ON pagos_realizados
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pagado_insertar();

-- Trigger: UPDATE en pagos_realizados
CREATE TRIGGER trg_pagos_realizados_update
AFTER UPDATE ON pagos_realizados
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pagado_actualizar();

-- Trigger: DELETE en pagos_realizados
CREATE TRIGGER trg_pagos_realizados_delete
AFTER DELETE ON pagos_realizados
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pagado_eliminar();

-- =====================================================
-- TRIGGERS: Actualizar estado de calendarios_pagos
-- =====================================================

-- Función: Actualizar estado de cuotas según pagos realizados
-- Maneja pagos que abarquen múltiples cuotas
CREATE OR REPLACE FUNCTION actualizar_estado_calendario()
RETURNS TRIGGER AS $$
DECLARE
  monto_restante numeric;
  cuota_actual record;
BEGIN
  -- Inicializar monto a aplicar
  monto_restante := NEW.monto_pagado;
  
  -- Iterar sobre cuotas pendientes/parcialmente pagadas en orden
  FOR cuota_actual IN
    SELECT id, numero_cuota, saldo_pendiente, monto_programado
    FROM calendarios_pagos
    WHERE cliente_id = NEW.cliente_id
      AND estado IN ('pendiente', 'parcialmente_pagado')
    ORDER BY numero_cuota ASC
  LOOP
    -- Si no hay monto restante, salir del loop
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
    
    -- Actualizar monto restante
    monto_restante := monto_restante - cuota_actual.saldo_pendiente;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Actualizar calendario al registrar pago
CREATE TRIGGER trg_actualizar_calendario_pago
AFTER INSERT ON pagos_realizados
FOR EACH ROW
EXECUTE FUNCTION actualizar_estado_calendario();

-- =====================================================
-- COMENTARIOS DE TABLAS Y COLUMNAS
-- =====================================================
COMMENT ON TABLE calendarios_pagos IS 'Plan de cobro del cliente. Una cuota = una fila. Se genera al crear cliente.';
COMMENT ON TABLE pagos_realizados IS 'Registro de TODOS los pagos. Cada pago realizado (parcial, total, exceso) es UNA fila. Los triggers automáticamente sincronizan clientes.total_pagado y calendarios_pagos.saldo_pendiente';
COMMENT ON COLUMN calendarios_pagos.estado IS 'pendiente: no se pagó nada | parcialmente_pagado: se pagó parte | pagado: se pagó 100%';
COMMENT ON COLUMN calendarios_pagos.saldo_pendiente IS 'Lo que falta por pagar de esta cuota. Se actualiza automáticamente cuando se registra un pago.';
COMMENT ON COLUMN pagos_realizados.monto_pagado IS 'Cantidad que el cliente pagó. PUEDE ser diferente a monto_programado. Automáticamente actualiza clientes.total_pagado';
