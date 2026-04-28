# 📋 Proceso de 2 Pasos: Calendario Manual + Migración Automática

## 🎯 Flujo General

```
PASO 1: Subir Calendario de Pagos (MANUAL)
    ↓
    Cada cliente → Múltiples cuotas (1, 2, 3...)
    ↓
PASO 2: Migrar Pagos Realizados (AUTOMÁTICO)
    ↓
    Triggers actualizan:
    - calendarios_pagos.saldo_pendiente
    - clientes.total_pagado
    - calendarios_pagos.estado
    ↓
✅ TODO SINCRONIZADO
```

---

## 📊 PASO 1: Subir Calendario de Pagos (Manualmente)

### Opción A: Desde Supabase Studio (UI - Más Fácil)

1. Abre [Supabase Dashboard](https://app.supabase.com) → Tu proyecto
2. Ve a **Table Editor** → `calendarios_pagos`
3. Haz click en **Insert** (o botón +)
4. Ingresa los datos de la cuota:

```
cliente_id:         [UUID del cliente]
numero_cuota:       [1, 2, 3...]
fecha_programada:   [2024-05-15]
monto_programado:   [100.00]
estado:             [pendiente]
saldo_pendiente:    [100.00]  ← Mismo que monto_programado si no se pagó nada
notas:              [Cuota 1 de 4]  (opcional)
```

5. Click **Save**
6. Repite para cada cuota

**Ventaja:** ✅ Sencillo, visual
**Desventaja:** ❌ Lento si tienes muchas cuotas

---

### Opción B: Por SQL Script (Más Rápido)

Si tus datos están en la tabla vieja `pagos`, puedes copiar automáticamente:

```sql
-- Insertar estructura de pagos viejos como cuotas
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
  CASE
    WHEN p.estado = 'pagado' THEN 'pagado'
    ELSE 'pendiente'
  END as estado,
  GREATEST(0, p.monto_programado - COALESCE(p.monto_pagado, 0)) as saldo_pendiente,
  CONCAT('Cuota ', p.numero_pago) as notas,
  p.created_at,
  p.updated_at
FROM pagos p
WHERE NOT EXISTS (
  SELECT 1 FROM calendarios_pagos cp
  WHERE cp.cliente_id = p.cliente_id
    AND cp.numero_cuota = p.numero_pago
)
ON CONFLICT DO NOTHING;
```

**Ventaja:** ✅ Automático, rápido
**Desventaja:** ❌ Copia estado viejo (no importa, se actualiza después)

**Ejecutar en:** SQL Editor → New Query → Copiar → Run

---

### Opción C: Por TypeScript/API (Para aplicación)

```typescript
// Hook personalizado para cargar calendario
const cargarCalendarioPagos = async (clienteId: string) => {
  const { data: pagosViejos } = await supabase
    .from('pagos')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('numero_pago')

  // Transformar a cuotas
  const cuotas = pagosViejos.map(p => ({
    cliente_id: clienteId,
    numero_cuota: p.numero_pago,
    fecha_programada: p.fecha_programada,
    monto_programado: p.monto_programado,
    estado: p.estado === 'pagado' ? 'pagado' : 'pendiente',
    saldo_pendiente: p.monto_programado - (p.monto_pagado || 0),
    notas: `Cuota ${p.numero_pago}`
  }))

  // Insertar en calendarios_pagos
  const { data } = await supabase
    .from('calendarios_pagos')
    .insert(cuotas)

  return data
}
```

---

## ✔️ Verificación: Calendarios Subidos

Una vez que termines de subir cuotas, ejecuta esto:

```sql
SELECT
  c.numero_contrato,
  c.nombre_completo,
  COUNT(*) as total_cuotas,
  SUM(monto_programado) as total_programado
FROM calendarios_pagos cp
JOIN clientes c ON cp.cliente_id = c.id
GROUP BY c.id, c.numero_contrato, c.nombre_completo
ORDER BY c.nombre_completo;
```

**Esperado:** Cada cliente con sus cuotas ✅

---

## 🔄 PASO 2: Migrar Pagos Realizados (AUTOMÁTICO)

Una vez que `calendarios_pagos` esté lleno, ejecuta:

### En Supabase Dashboard:
1. SQL Editor → New Query
2. Copia contenido de `006b_migrar_solo_pagos_realizados.sql`
3. Click **Run**

### Por CLI:
```bash
supabase db push --file supabase/migrations/006b_migrar_solo_pagos_realizados.sql
```

---

## ⚡ Los TRIGGERS Hacen El Resto

Cuando ejecutes PASO 2, los **triggers automáticamente**:

```sql
-- Trigger 1: Insertar pagos_realizados
-- ↓ Activa automáticamente...

-- Trigger 2: actualizar_total_pagado_insertar()
UPDATE clientes SET total_pagado = total_pagado + monto

-- Trigger 3: actualizar_estado_calendario()
-- Busca primera cuota pendiente y aplica el pago
UPDATE calendarios_pagos SET
  saldo_pendiente = saldo_pendiente - monto,
  estado = CASE
    WHEN saldo_pendiente - monto <= 0 THEN 'pagado'
    WHEN saldo_pendiente - monto < monto_programado THEN 'parcialmente_pagado'
    ELSE 'pendiente'
  END
```

**Resultado:** ✅ TODO SINCRONIZADO sin código adicional

---

## ✔️ Verificación Final

Después de ejecutar PASO 2, verifica:

### 1. Pagos migrados
```sql
SELECT COUNT(*) as total_pagos FROM pagos_realizados;
-- Debe ser > 0 ✅
```

### 2. Clientes actualizados
```sql
SELECT
  c.numero_contrato,
  c.nombre_completo,
  (SELECT COUNT(*) FROM calendarios_pagos WHERE cliente_id = c.id) as total_cuotas,
  (SELECT COUNT(*) FROM calendarios_pagos WHERE cliente_id = c.id AND estado = 'pagado') as cuotas_pagadas,
  c.total_pagado,
  c.saldo
FROM clientes c
WHERE c.total_pagado > 0
ORDER BY c.nombre_completo;
```

**Esperado:**
- `total_cuotas` = número de cuotas ✅
- `cuotas_pagadas` = las que ya pagaron ✅
- `total_pagado` = suma de pagos_realizados ✅
- `saldo` = precio - descuento - total_pagado ✅

### 3. Estados de cuotas
```sql
SELECT
  estado,
  COUNT(*) as cantidad
FROM calendarios_pagos
GROUP BY estado;

-- Esperado:
-- pagado: X
-- parcialmente_pagado: X
-- pendiente: X
```

---

## 📋 Checklist del Proceso

### PASO 1: Calendarios
- [ ] Decidí método (Supabase UI, SQL, o TypeScript)
- [ ] Subí todos los calendarios de pagos
- [ ] Verifiqué: COUNT = correcto
- [ ] Cada cliente tiene sus cuotas

### PASO 2: Pagos Realizados
- [ ] Ejecuté `006b_migrar_solo_pagos_realizados.sql`
- [ ] Sin errores ✅
- [ ] Verifiqué: COUNT de pagos_realizados > 0

### Validación Final
- [ ] clientes.total_pagado se actualizó correctamente
- [ ] calendarios_pagos.saldo_pendiente calculado bien
- [ ] calendarios_pagos.estado = 'pagado', 'parcialmente_pagado', o 'pendiente'
- [ ] Vista v_resumen_pagos_cliente funciona

---

## ❓ Preguntas Frecuentes

**P: ¿Qué pasa si cometo un error subiendo calendarios?**
R: Puedes eliminar y re-ingresar. O ejecutar SQL DELETE antes de re-insertar.

**P: ¿Puedo dejar cuotas sin `saldo_pendiente`?**
R: No, es REQUIRED. Siempre = monto_programado si no se pagó nada.

**P: ¿Qué si tengo 100 cuotas, es lento subirlas una por una?**
R: Usa el método SQL o TypeScript, es 10x más rápido.

**P: ¿Los triggers funcionan si se fue la conexión?**
R: Sí, se ejecutan en la BD cuando se inserta en pagos_realizados.

**P: ¿Puedo editar un calendario después?**
R: Sí, pero cuidado: cambiar monto_programado afecta cálculos. Mejor crear uno nuevo.

---

## 🚀 Una Vez Completado

✅ Tienes:
- Calendarios de pagos cargados
- Pagos realizados migrados
- Clientes sincronizados
- Triggers funcionando

**Siguiente:** Crear hooks y componentes TypeScript para usar las nuevas tablas.

