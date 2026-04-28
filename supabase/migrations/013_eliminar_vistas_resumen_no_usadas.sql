-- =====================================================
-- Migración: Eliminar vistas de resumen no usadas
-- Propósito: Limpiar vistas que fueron reemplazadas y no se usan en el código actual
-- =====================================================

-- Eliminar vista antigua (migración 005/007)
DROP VIEW IF EXISTS v_resumen_pagos_cliente;

-- Eliminar vista alternativa que nunca se implementó (migración 010)
DROP VIEW IF EXISTS v_resumen_pagos_cliente_correcto;

-- =====================================================
-- NOTA: El nuevo Dashboard usa obtenerClientesPendientesAlDia()
-- que consulta directamente las tablas base (calendarios_pagos, clientes, gestores)
-- sin necesidad de vistas materializadas
-- =====================================================
