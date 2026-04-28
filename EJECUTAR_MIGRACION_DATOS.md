# 📊 Migración de Datos: Pagos Viejos → Nuevas Tablas

## 🎯 Qué Hace Esta Migración

Copia **todos los pagos** de la tabla vieja `pagos` a las nuevas tablas:

```
TABLA VIEJA (pagos)
├─ numero_pago → numero_cuota (calendarios_pagos)
├─ fecha_programada → fecha_programada (calendarios_pagos)
├─ monto_programado → monto_programado (calendarios_pagos)
├─ monto_pagado → monto_pagado (pagos_realizados) ← Si > 0
├─ estado → estado (calendarios_pagos) ← Convertido
└─ fecha_pago → fecha_pago (pagos_realizados) ← Si está registrado

RESULTADO:
  ✅ calendarios_pagos con todas las cuotas
  ✅ pagos_realizados con todos los pagos
  ✅ clientes.total_pagado actualizado
```

---

## 🚀 Cómo Ejecutar

### Paso 1: Ejecutar la Migración

**Opción A: Supabase Dashboard**
1. Abre [Supabase Dashboard](https://app.supabase.com) → Tu proyecto
2. Ve a **SQL Editor** → **New Query**
3. Copia contenido de `006_migrar_datos_pagos.sql`
4. Haz click en **Run** (o Ctrl+Enter)
5. Espera: ✅ **Success**

**Opción B: CLI**
```bash
supabase db push --file supabase/migrations/006_migrar_datos_pagos.sql
```

---

## ✔️ Verificación Post-Ejecución

Ejecuta estos queries en SQL Editor para verificar:

### 1️⃣ Cuántos registros se migraron
```sql
SELECT
  'Cuotas programadas' as tipo,
  COUNT(*) as cantidad
FROM calendarios_pagos
UNION ALL
SELECT
  'Pagos realizados',
  COUNT(*)
FROM pagos_realizados;
```

**Resultado esperado:** Números > 0 ✅

### 2️⃣ Comparar con datos viejos
```sql
-- Contar registros en tabla vieja
SELECT
  'Pagos viejos' as tipo,
  COUNT(*) as cantidad
FROM pagos;

-- Resultado debe ser similar o mayor que:
-- Cuotas (cada numero_pago = 1 cuota)
-- + Pagos realizados (solo si monto_pagado > 0)
```

### 3️⃣ Verificar estado de clientes
```sql
SELECT
  c.numero_contrato,
  c.nombre_completo,
  (SELECT COUNT(*) FROM calendarios_pagos WHERE cliente_id = c.id) as total_cuotas,
  (SELECT SUM(monto_pagado) FROM pagos_realizados WHERE cliente_id = c.id) as total_pagado,
  c.total_pagado as total_pagado_en_cliente,
  c.saldo as saldo_actual
FROM clientes c
WHERE EXISTS (SELECT 1 FROM calendarios_pagos WHERE cliente_id = c.id)
ORDER BY c.nombre_completo;
```

**Esperado:** 
- `total_pagado (DB)` ≈ `total_pagado_en_cliente` ✅
- `saldo_actual` = precio - descuento - total_pagado ✅

### 4️⃣ Verificar estados de cuotas
```sql
SELECT
  estado,
  COUNT(*) as cantidad
FROM calendarios_pagos
GROUP BY estado
ORDER BY estado;

-- Resultado esperado:
-- pendiente: X cuotas
-- parcialmente_pagado: X cuotas
-- pagado: X cuotas
```

---

## 🔍 Conversión de Estados

**Tabla vieja → Nueva:**

| Estado Viejo | Estado Nuevo | Razón |
|-------------|-------------|-------|
| `pagado` | `pagado` | ✅ Directo |
| `pendiente` | `pendiente` | ✅ Directo |
| `vencido` | `pendiente` | ⚠️ Vencido pasado = pendiente sin pagar |

---

## ⚠️ Consideraciones Importantes

### ❓ ¿Qué pasa con duplicados?
**Respuesta:** El script tiene protección:
```sql
WHERE NOT EXISTS (
  SELECT 1 FROM calendarios_pagos cp
  WHERE cp.cliente_id = p.cliente_id
    AND cp.numero_cuota = p.numero_pago
)
```

Si ejecutas 2 veces, no crea duplicados ✅

### ❓ ¿Puedo eliminar la tabla vieja?
**Respuesta:** NO aún. Espera a:
1. Verificar que los datos se migraron correctamente
2. Que los componentes TypeScript funcionen con nuevas tablas
3. Que los clientes confirmen los datos
4. ENTONCES: Hacer respaldo SQL de tabla `pagos` y después DROP

### ❓ ¿Qué pasa con los triggers?
**Respuesta:** Los triggers funcionan desde ahora con:
- ✅ Nuevos pagos (automáticamente)
- ✅ Ediciones de pagos (automáticamente)
- ✅ Datos migrados (ya están aplicados)

### ❓ ¿Hay datos inconsistentes?
**Posible causa:** Si editaste manualmente la tabla vieja sin mantener sincronía.

**Solución:**
```sql
-- Revisar inconsistencias
SELECT
  c.numero_contrato,
  c.nombre_completo,
  c.total_pagado as total_en_cliente,
  (SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_realizados WHERE cliente_id = c.id) as total_calculado
FROM clientes c
WHERE c.total_pagado != (SELECT COALESCE(SUM(monto_pagado), 0) FROM pagos_realizados WHERE cliente_id = c.id);

-- Si hay resultados, ejecuta esto para sincronizar:
UPDATE clientes c
SET total_pagado = COALESCE(
  (SELECT SUM(pr.monto_pagado) FROM pagos_realizados pr WHERE pr.cliente_id = c.id),
  0
);
```

---

## 📋 Checklist Post-Migración

- [ ] Ejecuté la migración 006_migrar_datos_pagos.sql
- [ ] Verifiqué cuántos registros se migraron
- [ ] Comparé con datos viejos (deben ser similares)
- [ ] Revisé estado de clientes (total_pagado correcto)
- [ ] Verifiqué conversión de estados (no hay problemas)
- [ ] No hay duplicados
- [ ] Los triggers funcionan con nuevos pagos
- [ ] Los componentes TypeScript están listos para usar nuevas tablas

---

## 🚀 Próximo Paso

Una vez migrados los datos:

1. ✅ Crear/actualizar hooks (`src/hooks/usePagos.ts`)
2. ✅ Actualizar componentes (`CalendarioPagos.tsx`, etc)
3. ✅ Crear validaciones
4. ✅ Testing manual
5. ⏳ Considerar: ¿Mantener tabla vieja o hacer backup y eliminar?

---

## 📞 En Caso de Problemas

**Si aparece error:**
```
ERROR: duplicate key value violates unique constraint
```

Significa: Ya estaban migrando, ejecutaste 2 veces, o hay datos duplicados.

**Solución:**
```sql
-- Ver qué existe ya
SELECT COUNT(*) FROM calendarios_pagos;
SELECT COUNT(*) FROM pagos_realizados;

-- Si quieres empezar de cero (CUIDADO: borra datos):
DELETE FROM pagos_realizados;
DELETE FROM calendarios_pagos;

-- Luego re-ejecuta la migración
```

---

## ✅ Resultado Final

Una vez completado:

**Tabla vieja (`pagos`)**: Sigue existiendo como respaldo histórico
**Nuevas tablas**: Contienen todos los datos sincronizados
**Clientes**: total_pagado actualizado correctamente
**Triggers**: Listos para nuevos pagos

El sistema está **100% migrado** ✨

