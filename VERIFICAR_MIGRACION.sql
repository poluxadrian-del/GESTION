-- =====================================================
-- VERIFICACIÓN COMPLETA: Después de Migración
-- Confirma que los triggers actualizaron todo correctamente
-- =====================================================

-- =====================================================
-- 1️⃣ VERIFICACIÓN GLOBAL
-- =====================================================
SELECT
  'Total cuotas programadas' as verificacion,
  COUNT(*) as cantidad
FROM calendarios_pagos
UNION ALL
SELECT
  'Total pagos realizados',
  COUNT(*)
FROM pagos_realizados
UNION ALL
SELECT
  'Clientes con datos',
  COUNT(DISTINCT cliente_id)
FROM calendarios_pagos;

-- =====================================================
-- 2️⃣ ESTADO DE CUOTAS (Trigger trabajó?)
-- =====================================================
SELECT
  estado,
  COUNT(*) as cantidad
FROM calendarios_pagos
GROUP BY estado
ORDER BY estado;

-- Esperado:
-- pendiente: X
-- parcialmente_pagado: X
-- pagado: X

-- =====================================================
-- 3️⃣ DETALLE POR CLIENTE (Lo más importante)
-- =====================================================
SELECT
  c.numero_contrato,
  c.nombre_completo,
  COUNT(DISTINCT cp.id) as total_cuotas,
  SUM(CASE WHEN cp.estado = 'pagado' THEN 1 ELSE 0 END) as cuotas_pagadas,
  SUM(CASE WHEN cp.estado = 'parcialmente_pagado' THEN 1 ELSE 0 END) as cuotas_parciales,
  SUM(CASE WHEN cp.estado = 'pendiente' THEN 1 ELSE 0 END) as cuotas_pendientes,
  SUM(cp.saldo_pendiente) as total_saldo_pendiente,
  COALESCE(SUM(pr.monto_pagado), 0) as total_pagado_realizado,
  c.total_pagado as total_pagado_cliente,
  c.saldo as saldo_cliente,
  c.estado as estado_cliente
FROM clientes c
LEFT JOIN calendarios_pagos cp ON c.id = cp.cliente_id
LEFT JOIN pagos_realizados pr ON c.id = pr.cliente_id
WHERE EXISTS (SELECT 1 FROM calendarios_pagos WHERE cliente_id = c.id)
GROUP BY c.id, c.numero_contrato, c.nombre_completo, c.total_pagado, c.saldo, c.estado
ORDER BY c.nombre_completo;

-- Esperado:
-- total_pagado_realizado ≈ total_pagado_cliente ✅
-- saldo_cliente = monto_contrato - descuento - total_pagado ✅
-- cuotas_pagadas > 0 si hay pagos ✅

-- =====================================================
-- 4️⃣ VERIFICACIÓN DE SINCRONIZACIÓN (CRÍTICO)
-- =====================================================
-- Si hay diferencias aquí, hay problema
SELECT
  c.numero_contrato,
  c.nombre_completo,
  c.total_pagado as total_en_cliente,
  COALESCE(SUM(pr.monto_pagado), 0) as total_calculado,
  CASE
    WHEN c.total_pagado = COALESCE(SUM(pr.monto_pagado), 0) THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END as estado_sincronizacion
FROM clientes c
LEFT JOIN pagos_realizados pr ON c.id = pr.cliente_id
WHERE EXISTS (SELECT 1 FROM calendarios_pagos WHERE cliente_id = c.id)
GROUP BY c.id, c.numero_contrato, c.nombre_completo, c.total_pagado
ORDER BY c.numero_contrato;

-- Esperado: Todas las filas deben mostrar "✅ OK"

-- =====================================================
-- 5️⃣ USO DE VISTA: v_resumen_pagos_cliente
-- =====================================================
SELECT * FROM v_resumen_pagos_cliente
ORDER BY nombre_completo;

-- Esta vista debe mostrar el resumen consolidado de todos los clientes

-- =====================================================
-- 6️⃣ BÚSQUEDA DE PROBLEMAS (Si algo falló)
-- =====================================================
-- Clientes con cuotas pero sin saldo_pendiente actualizado
SELECT
  c.numero_contrato,
  c.nombre_completo,
  COUNT(cp.id) as cuotas,
  SUM(cp.saldo_pendiente) as saldo_pendiente_total,
  c.saldo as saldo_cliente
FROM clientes c
LEFT JOIN calendarios_pagos cp ON c.id = cp.cliente_id
WHERE cp.saldo_pendiente IS NULL
GROUP BY c.id
ORDER BY c.nombre_completo;

-- Si hay resultados, hay problema con triggers

-- =====================================================
-- 7️⃣ VERIFICACIÓN DE TRIGGERS (Si funcionan)
-- =====================================================
-- Ver si existen los triggers
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('calendarios_pagos', 'pagos_realizados')
ORDER BY event_object_table, trigger_name;

-- Esperado: 4 triggers
-- - trg_pagos_realizados_insert
-- - trg_pagos_realizados_update
-- - trg_pagos_realizados_delete
-- - trg_actualizar_calendario_pago

-- =====================================================
-- CONCLUSIÓN
-- =====================================================
-- Si todos los queries anteriores muestran:
-- ✅ Cuotas con estado actualizado
-- ✅ Clientes.total_pagado sincronizado
-- ✅ Saldo_pendiente calculado
-- ✅ Triggers existentes
-- 
-- ENTONCES: TODO ESTÁ CORRECTO Y LISTO PARA HOOKS
