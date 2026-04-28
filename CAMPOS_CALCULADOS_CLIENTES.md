# ⚙️ Campos Calculados en Tabla `clientes`

## Importante: NO MANIPULAR MANUALMENTE

Los siguientes campos se actualizan **automáticamente por triggers** en la base de datos. 
**NUNCA** los calcules o actualices manualmente en el frontend.

---

## 📊 Campos Calculados

### 1. `clientes.total_pagado` 
**Actualizado por:** Triggers en tabla `pagos_realizados`

```sql
-- TRIGGER: trg_pagos_realizados_insert
-- Cuando: INSERT INTO pagos_realizados
-- Acción: total_pagado += monto_pagado

-- TRIGGER: trg_pagos_realizados_update
-- Cuando: UPDATE pagos_realizados SET monto_pagado
-- Acción: total_pagado += (nuevo_monto - monto_anterior)

-- TRIGGER: trg_pagos_realizados_delete
-- Cuando: DELETE FROM pagos_realizados
-- Acción: total_pagado -= monto_pagado
```

**Valores en Supabase:**
```
clientes.total_pagado = SUM(pagos_realizados.monto_pagado)
                        WHERE cliente_id = clientes.id
```

---

### 2. `clientes.saldo`
**Actualizado por:** Función de Supabase (READ-ONLY, calculado en query)

```sql
-- Definición lógica:
saldo = total_programado - total_pagado

-- Nota: Este campo se calcula EN TIEMPO DE LECTURA
-- No se almacena físicamente; se obtiene de la vista materializada
-- o se calcula en el SELECT
```

---

### 3. `clientes.cuotas_pagadas`
**Ubicación:** Vista materializada `v_resumen_pagos_cliente`

```sql
-- Actualizada por: Vista que cuenta cuotas con estado = 'pagado'
SELECT COUNT(*) as cuotas_pagadas
FROM calendarios_pagos
WHERE cliente_id = clientes.id 
  AND estado = 'pagado'
```

---

## 🚨 Reglas Importantes

### ❌ NUNCA HAGAS ESTO:

```typescript
// ❌ MAL: Calcular manualmente en frontend
const nuevoSaldo = cliente.saldo - montoPagado
actualizarCliente({ ...cliente, saldo: nuevoSaldo })

// ❌ MAL: Actualizar total_pagado manualmente
const nuevoTotal = cliente.total_pagado + montoPagado
actualizarCliente({ ...cliente, total_pagado: nuevoTotal })

// ❌ MAL: Hacer UPDATE directo en base de datos
UPDATE clientes SET total_pagado = 1500 WHERE id = '...'
```

### ✅ SIEMPRE HAZ ESTO:

```typescript
// ✅ BIEN: Solo inserta el pago
const pago = await registrarPagoRealizado(clienteId, {
  fecha_pago,
  monto_pagado,
  gestor_id,
  notas
})

// ✅ BIEN: Los triggers actualizarán todo automáticamente
// El sistema hace:
// 1. INSERT INTO pagos_realizados
// 2. TRIGGER: actualiza clientes.total_pagado
// 3. TRIGGER: actualiza calendarios_pagos.saldo_pendiente
// 4. TRIGGER: actualiza calendarios_pagos.estado

// ✅ BIEN: Recargar cliente para mostrar datos actualizados
const clienteActualizado = await obtenerClientePorId(clienteId)
setCliente(clienteActualizado)
```

---

## 📡 Flujo de Actualización (Automático)

```
Usuario registra pago
  ↓
registrarPagoRealizado() [1 INSERT]
  ↓
INSERT INTO pagos_realizados (cliente_id, monto_pagado, ...)
  ↓
TRIGGER: trg_pagos_realizados_insert
  ├── UPDATE clientes SET total_pagado = total_pagado + monto_pagado
  └── TRIGGER: trg_actualizar_calendario_pago (AFTER INSERT)
      └── UPDATE calendarios_pagos SET saldo_pendiente = saldo_pendiente - monto_pagado
          └── UPDATE calendarios_pagos SET estado = 'pagado' (si saldo = 0)
          └── Aplicar monto restante a siguiente cuota (si monto > saldo)
  ↓
Vista v_resumen_pagos_cliente se actualiza automáticamente
  ↓
Frontend refresca datos con obtenerClientePorId()
  ↓
UI actualizada ✅
```

---

## 🔄 En el Frontend

### CalendarioPagos.v2.tsx
```typescript
// Paso 1: Registrar pago
await registrarPagoRealizado(clienteId, formData)

// Paso 2: Los triggers hacen todo en la BD

// Paso 3: Recargar datos (opcional pero recomendado)
const resumen = await obtenerResumenCliente(clienteId)
setResumen(resumen) // Ahora muestra datos actualizados
```

### Hook `usePagos.ts`
```typescript
export function usePagos() {
  // Estos NO hacen cálculos, solo queries:
  
  const registrarPagoRealizado = async (clienteId, input) => {
    // 1 INSERT solamente
    const { data, error } = await supabase
      .from('pagos_realizados')
      .insert([{ cliente_id: clienteId, ...input }])
      .select()
    
    // Los TRIGGERS del servidor hacen el resto automáticamente
    return data?.[0]
  }
  
  const obtenerResumenCliente = async (clienteId) => {
    // Lee la vista materializada (datos ya calculados)
    const { data } = await supabase
      .from('v_resumen_pagos_cliente')
      .select('*')
      .eq('cliente_id', clienteId)
      .single()
    
    return data
  }
}
```

---

## ✅ Checklist

- [ ] No calculas `total_pagado` en TypeScript
- [ ] No calculas `saldo` en TypeScript  
- [ ] No calculas `cuotas_pagadas` en TypeScript
- [ ] Usas `registrarPagoRealizado()` para insertar pagos
- [ ] Recargas datos con `obtenerClientePorId()` o `obtenerResumenCliente()`
- [ ] Dejas que los triggers hagan su trabajo
- [ ] No modificas directamente `clientes.total_pagado` en UPDATE

---

## 📚 Referencia Rápida

| Campo | Actualizado Por | Cómo Refrescar |
|-------|-----------------|---|
| `clientes.total_pagado` | Triggers de `pagos_realizados` | `obtenerClientePorId()` |
| `clientes.saldo` | Cálculo en tiempo de lectura | `obtenerClientePorId()` |
| `clientes.cuotas_pagadas` | Vista `v_resumen_pagos_cliente` | `obtenerResumenCliente()` |
| `calendarios_pagos.saldo_pendiente` | Trigger `trg_actualizar_calendario_pago` | `obtenerCalendarioPagos()` |
| `calendarios_pagos.estado` | Trigger `trg_actualizar_calendario_pago` | `obtenerCalendarioPagos()` |

---

## 🎯 Resumen

```
REGISTRAR PAGO
  ↓
1 INSERT (Supabase)
  ↓
Triggers actualizan TODO
  ↓
Refrescar datos en frontend
  ↓
Mostrar cambios ✅

NO HAGAS CÁLCULOS MANUALES
Confía en los triggers
```
