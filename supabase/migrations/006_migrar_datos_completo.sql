-- =====================================================
-- Migración 006: Migración de datos de estructura antigua
-- Copia: pagos → calendarios_pagos + pagos_realizados
-- =====================================================

-- =====================================================
-- PASO 1: Copiar calendario de cuotas
-- =====================================================
INSERT INTO calendarios_pagos (
  cliente_id,
  numero_cuota,
  fecha_programada,
  monto_programado,
  estado,
  saldo_pendiente,
  notas,
  created_at,
  updated_at
)
SELECT
  p.cliente_id,
  p.numero_pago as numero_cuota,
  p.fecha_programada,
  p.monto_programado,
  -- Convertir estado viejo a nuevo
  CASE
    WHEN p.estado = 'pagado' THEN 'pagado'
    WHEN p.estado = 'vencido' THEN 'pendiente'
    ELSE 'pendiente'
  END as estado,
  -- Calcular saldo pendiente
  GREATEST(0, p.monto_programado - COALESCE(p.monto_pagado, 0)) as saldo_pendiente,
  CONCAT('Migrado de tabla pagos antigua. Estado original: ', p.estado) as notas,
  p.created_at,
  p.updated_at
FROM pagos p
WHERE NOT EXISTS (
  SELECT 1 FROM calendarios_pagos cp
  WHERE cp.cliente_id = p.cliente_id
    AND cp.numero_cuota = p.numero_pago
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PASO 2: Copiar pagos realizados
-- =====================================================
INSERT INTO pagos_realizados (
  cliente_id,
  gestor_id,
  fecha_pago,
  monto_pagado,
  notas,
  created_at
)
SELECT
  p.cliente_id,
  p.gestor_id,
  p.fecha_pago,
  p.monto_pagado,
  'Migrado de tabla pagos antigua' as notas,
  p.created_at
FROM pagos p
WHERE p.monto_pagado > 0
  AND p.fecha_pago IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pagos_realizados pr
    WHERE pr.cliente_id = p.cliente_id
      AND pr.fecha_pago = p.fecha_pago
      AND pr.monto_pagado = p.monto_pagado
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- PASO 3: Actualizar totales de clientes
-- =====================================================
UPDATE clientes c
SET total_pagado = COALESCE(
  (SELECT SUM(pr.monto_pagado)
   FROM pagos_realizados pr
   WHERE pr.cliente_id = c.id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM pagos p WHERE p.cliente_id = c.id
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Resumen de migración
SELECT
  'Cuotas programadas (calendarios_pagos)' as tipo,
  COUNT(*) as cantidad
FROM calendarios_pagos
UNION ALL
SELECT
  'Pagos realizados (pagos_realizados)',
  COUNT(*)
FROM pagos_realizados;
