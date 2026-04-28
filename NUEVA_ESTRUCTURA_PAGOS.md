# 📋 Estructura Nueva de Pagos - Guía de Lógica

## 🎯 Resumen de Cambios

Hemos separado la tabla `pagos` en **dos tablas independientes con sincronización automática**:

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Tabla de control** | 1 tabla `pagos` | `calendarios_pagos` + `pagos_realizados` |
| **Relación** | pagos ← cliente | calendarios_pagos ← cliente<br/>pagos_realizados ← cliente |
| **Propósito** | Control todo en uno | Separado: plan vs registro |
| **Flexibilidad** | Limitada | Total (cualquier monto) |
| **Auditoría** | Compleja | Cada pago es un registro |
| **Sincronización** | Manual | **Automática (TRIGGERS)** ✨ |

---

## ⚡ Sincronización Automática (TRIGGERS)

Hemos agregado **6 triggers automáticos** que mantienen todo sincronizado sin que tengas que hacer nada en TypeScript:

### 🔄 Triggers en `pagos_realizados`

**1. Al INSERTAR un pago:**
```sql
TRIGGER: trg_pagos_realizados_insert
↓
Automáticamente suma el monto a clientes.total_pagado
↓
Actualiza el estado de la primera cuota pendiente
```

**2. Al ACTUALIZAR un pago:**
```sql
TRIGGER: trg_pagos_realizados_update
↓
Calcula la diferencia (nuevo_monto - monto_viejo)
↓
Ajusta clientes.total_pagado
```

**3. Al ELIMINAR un pago:**
```sql
TRIGGER: trg_pagos_realizados_delete
↓
Resta el monto de clientes.total_pagado
```

### 📅 Triggers en `calendarios_pagos`

**4. Al registrar un pago:**
```sql
TRIGGER: trg_actualizar_calendario_pago
↓
Busca la primera cuota pendiente
↓
Actualiza su saldo_pendiente
↓
Cambia su estado automáticamente
```

---

## 📊 Estructura de Datos

### Tabla: `calendarios_pagos`
**Propósito**: Plan de cobro - "Qué días debo cobrar"

```
cliente_id  numero_cuota  fecha_programada  monto_programado  estado  saldo_pendiente
────────────────────────────────────────────────────────────────────────────────────
cli-001     1             2024-05-15        $100.00          pagado  $0
cli-001     2             2024-06-15        $100.00          pagado  $0
cli-001     3             2024-07-15        $100.00          pendiente  $100.00
cli-001     4             2024-08-15        $100.00          pendiente  $100.00
```

**Campos clave:**
- `numero_cuota`: 1, 2, 3... (secuencial)
- `fecha_programada`: Cuándo se DEBE cobrar
- `monto_programado`: Cuota esperada (fija)
- `estado`: pendiente | parcialmente_pagado | pagado
- `saldo_pendiente`: monto_programado - lo pagado hasta ahora

### Tabla: `pagos_realizados`
**Propósito**: Registro de pagos - "Qué pagos se han hecho"

```
cliente_id  fecha_pago     monto_pagado  gestor_id   notas
─────────────────────────────────────────────────────────────
cli-001     2024-05-15     $100.00      ges-01      Pago completo
cli-001     2024-06-10     $50.00       ges-01      Pago parcial
cli-001     2024-06-20     $50.00       ges-02      Saldo de cuota 2
cli-001     2024-07-15     $150.00      ges-01      Adelanto
```

**Campos clave:**
- `fecha_pago`: Cuándo se PAGÓ
- `monto_pagado`: CUALQUIER cantidad (flexible)
- No hay relación directa con calendarios_pagos

---

## 🔄 Flujos de Operación

### 1️⃣ CREAR CLIENTE
```
Usuario crea cliente con datos:
  - monto_pago: $100
  - numero_pagos: 4
  - fecha_primer_pago: 2024-05-15
  - frecuencia_pago: mensual

Sistema genera automáticamente:
  4 filas en calendarios_pagos
  ├─ cuota 1: fecha 2024-05-15, monto $100
  ├─ cuota 2: fecha 2024-06-15, monto $100
  ├─ cuota 3: fecha 2024-07-15, monto $100
  └─ cuota 4: fecha 2024-08-15, monto $100
  
todos con estado='pendiente' y saldo_pendiente=$100
```

### 2️⃣ REGISTRAR UN PAGO
```
Usuario registra pago:
  fecha_pago: 2024-05-15
  monto_pagado: $100  ← Puede ser CUALQUIER cantidad

Sistema (AUTOMÁTICO con TRIGGERS):
  ┌─ INSERT en pagos_realizados
  │
  ├─ TRIGGER 1: Actualizar clientes
  │   UPDATE clientes SET total_pagado = total_pagado + 100
  │   UPDATE clientes SET updated_at = now()
  │
  ├─ TRIGGER 2: Buscar primera cuota pendiente
  │   SELECT FROM calendarios_pagos 
  │   WHERE cliente_id = X AND estado = 'pendiente'
  │   ORDER BY numero_cuota LIMIT 1
  │
  └─ TRIGGER 3: Actualizar cuota encontrada
      UPDATE calendarios_pagos SET
        saldo_pendiente = saldo_pendiente - 100
        estado = CASE WHEN saldo_pendiente <= 100 THEN 'pagado'
                      WHEN ... THEN 'parcialmente_pagado'
                      ELSE 'pendiente'
        updated_at = now()

✅ TODO AUTOMÁTICO - Sin código TypeScript adicional
```

**Resultado:** 
- ✅ `clientes.total_pagado` actualizado
- ✅ `clientes.saldo` recalculado (es GENERATED ALWAYS)
- ✅ `calendarios_pagos` actualizado
- ✅ Sin queries manuales en el código

**Ejemplos prácticos:**

**Caso A: Pago exacto**
```
Cuota 1: monto_programado=$100, saldo_pendiente=$100
Pago registrado: $100

Resultado:
  - saldo_pendiente = $100 - $100 = $0
  - estado = 'pagado'
```

**Caso B: Pago parcial**
```
Cuota 1: monto_programado=$100, saldo_pendiente=$100
Pago registrado: $60

Resultado:
  - saldo_pendiente = $100 - $60 = $40
  - estado = 'parcialmente_pagado'
```

**Caso C: Pago con exceso (puede cubrir siguiente cuota)**
```
Cuota 1: monto_programado=$100, saldo_pendiente=$100
Cuota 2: monto_programado=$100, saldo_pendiente=$100
Pago registrado: $150

Sistema lo aplica así:
  - Cuota 1: saldo = $100 - $100 = $0, estado = 'pagado'
  - Cuota 2: saldo = $100 - $50 = $50, estado = 'parcialmente_pagado'
```

**Caso D: Pago para una cuota diferente**
```
Cuota 1: PAGADA
Cuota 2: monto_programado=$100, saldo_pendiente=$100
Pago registrado: $100 (3 meses después de lo programado)

Sistema:
  - payos_realizados registra el pago
  - El cálculo de qué cuota se pagó es por ORDEN FIFO:
    → Busca la primera cuota con saldo_pendiente > 0
    → Le aplica el pago
```

### 3️⃣ VER ESTADO DE CLIENTE
```
En dashboard/reportes, para cliente cli-001:

SELECT 
  SUM(monto_programado) as total_deuda = $400
  SUM(saldo_pendiente) as total_pendiente = $190
  SUM(monto_pagado) as total_pagado = $210
  
Donde total_pagado viene de:
  SELECT SUM(monto_pagado) FROM pagos_realizados 
  WHERE cliente_id = 'cli-001'
```

---

## 🛠️ Cambios en Lógica de Negocio

### ¿Qué hace TypeScript ahora?

**Antes:** Mucha lógica manual
```typescript
// Insertar pago
// Actualizar clientes.total_pagado
// Buscar cuota pendiente
// Actualizar estado de cuota
// Verificar si cliente está liquidado
// ... 5-6 queries por pago
```

**Ahora:** SOLO 1 INSERT (los triggers hacen el resto)
```typescript
// Simplemente insertar en pagos_realizados
const { data } = await supabase
  .from('pagos_realizados')
  .insert({
    cliente_id: clienteId,
    gestor_id: gestorId,
    fecha_pago: fechaPago,
    monto_pagado: monto  // ← Cualquier cantidad
  })
// ✅ Los triggers hacen:
//   - Actualizar clientes.total_pagado
//   - Actualizar calendarios_pagos.saldo_pendiente
//   - Cambiar estado de cuota
```

### Archivo: `businessLogic.ts`

**Mantener:**
- `generarCalendarioPagos()` - Genera las cuotas iniciales
- `calcularDiaPago2()` - Para quincenales

**Ya NO necesita:**
- ❌ `aplicarPagoACuotas()` - Lo hacen los triggers
- ❌ `recalcularTotalPagado()` - Lo hacen los triggers

### Archivo: `usePagos.ts`

**Función nueva:**

```typescript
// Registrar nuevo pago (SIMPLE - solo INSERT)
registrarPagoRealizado(
  clienteId: string,
  input: {
    fecha_pago: string,
    monto_pagado: number,  // Flexible - cualquier cantidad
    gestor_id: string,
    notas?: string
  }
): Promise<PagoRealizado> {
  // Los triggers hacen todo automáticamente
  return supabase
    .from('pagos_realizados')
    .insert({
      cliente_id: clienteId,
      ...input
    })
    .select()
    .single()
}
```

**Funciones relacionadas:**

```typescript
// Obtener calendario de pagos
obtenerCalendarioPagos(clienteId: string): Promise<CalendarioPago[]>

// Obtener pagos realizados
obtenerPagosRealizados(clienteId: string): Promise<PagoRealizado[]>

// Editar pago realizado (trigger actualiza totales)
editarPagoRealizado(
  pagoId: string,
  input: Partial<PagoRealizado>
): Promise<PagoRealizado>

// Eliminar pago realizado (trigger resta el monto)
eliminarPagoRealizado(pagoId: string): Promise<void>

// Obtener resumen de cliente (desde vista)
obtenerResumenCliente(clienteId: string): Promise<ResumenPagoCliente>
```

---

## 📱 Cambios en Componentes

### `CalendarioPagos.tsx`
```typescript
// Obtener datos (sin cálculos, directo de BD)
const calendario = usePagos.obtenerCalendarioPagos(clienteId)
const pagosRealizados = usePagos.obtenerPagosRealizados(clienteId)

// Mostrar en tabla:
// numero_cuota | fecha_programada | monto_programado | saldo_pendiente | estado
//      1       |   2024-05-15     |     $100.00      |      $0        | pagado ✅
//      2       |   2024-06-15     |     $100.00      |     $50        | parcialmente_pagado ⚠️
//      3       |   2024-07-15     |     $100.00      |    $100        | pendiente ⏱️
```

**Cambios mínimos:**
- Obtener datos de `calendarios_pagos` en lugar de `pagos`
- Mostrar estado actualizado automáticamente por triggers
- No hacer cálculos manuales

### Nuevo Modal: `ModalRegistrarPagoRealizado.tsx`
```
Campos:
  - fecha_pago (date, required)
  - monto_pagado (number, required, > 0)  ← FLEXIBLE
  - gestor_id (select, required)
  - notas (textarea, optional)

Botón: [Registrar Pago]

Acción al hacer clic:
  usePagos.registrarPagoRealizado(clienteId, {
    fecha_pago,
    monto_pagado,  // Puede ser $30, $100, $200, cualquier monto
    gestor_id,
    notas
  })
  // ✅ Los triggers actualizan todo automáticamente
```

### Dashboard (uso de vista)
```typescript
// Usar la vista v_resumen_pagos_cliente
const resumen = await supabase
  .from('v_resumen_pagos_cliente')
  .select('*')
  .eq('cliente_id', clienteId)
  .single()

// Mostrar:
// Total deuda: resumen.total_programado
// Total pagado: resumen.total_pagado_realizado
// Saldo pendiente: resumen.total_saldo_pendiente
// Cuotas pagadas: resumen.cuotas_pagadas / resumen.total_cuotas_programadas
```

**Sin cálculos manuales** - Todo viene de la vista

---

## ✅ Validaciones

### `validations/calendario-pago.ts` (nuevo)
```typescript
crearCalendarioPagoSchema: {
  cliente_id: UUID
  numero_cuota: number >= 1
  fecha_programada: date
  monto_programado: number > 0
}
```

### `validations/pago-realizado.ts` (nuevo)
```typescript
registrarPagoRealizadoSchema: {
  cliente_id: UUID
  fecha_pago: date, <= today
  monto_pagado: number > 0
  gestor_id: UUID
  notas: string, optional, max 500
}
```

---

## 🔐 Permisos

| Rol | Ver Calendario | Ver Pagos Realizados | Registrar Pago | Editar Pago | Eliminar Pago |
|-----|-------|-------|-------|-------|-------|
| Socio | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supervisor | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## � Flujo Completo (De Punta a Punta)

### Ejemplo: Cliente paga $150 cuando la cuota es $100

```
USUARIO             REACT UI              TypeScript            BASE DE DATOS            TRIGGERS AUTOMÁTICOS
  │                   │                       │                       │                          │
  │─ Click en         │                       │                       │                          │
  │  [Registrar Pago] │                       │                       │                          │
  │                   │─ Abre modal ────────►│                       │                          │
  │                   │  Campos:             │                       │                          │
  │                   │  • fecha: 2024-05-15 │                       │                          │
  │                   │  • monto: $150       │                       │                          │
  │                   │  • gestor: Juan      │                       │                          │
  │                   │                      │                       │                          │
  │─ Ingresa datos    │                      │                       │                          │
  │                   │                      │                       │                          │
  │─ Click            │                      │                       │                          │
  │  [Guardar]        │                      │                       │                          │
  │                   │─ Valida campos ────► │                       │                          │
  │                   │                      │                       │                          │
  │                   │                      │─ INSERT en            │                          │
  │                   │                      │  pagos_realizados ───►│                          │
  │                   │                      │  {                    │  INSERT creado           │
  │                   │                      │   cliente_id: X       │  ✅                      │
  │                   │                      │   fecha_pago: ...     │  │                       │
  │                   │                      │   monto_pagado: 150   │  └──────────────────────►│
  │                   │                      │   gestor_id: Y        │     TRIGGER 1: INSERT    │
  │                   │                      │  }                    │     UPDATE clientes      │
  │                   │                      │                       │     SET total_pagado =   │
  │                   │                      │                       │     total_pagado + 150   │
  │                   │                      │                       │     ✅ total_pagado: 150 │
  │                   │                      │                       │                          │
  │                   │                      │                       │     TRIGGER 2: UPDATE    │
  │                   │                      │                       │     calendarios_pagos    │
  │                   │                      │                       │     SET saldo_pend = 0   │
  │                   │                      │                       │     estado = 'pagado'    │
  │                   │                      │                       │     ✅ Cuota 1: pagada   │
  │                   │                      │                       │                          │
  │                   │                      │                       │     TRIGGER 3: UPDATE   │
  │                   │                      │                       │     calendarios_pagos    │
  │                   │                      │                       │     (próxima cuota)      │
  │                   │                      │                       │     SET saldo_pend = 50  │
  │                   │                      │                       │     estado = 'parcial'   │
  │                   │                      │                       │     ✅ Cuota 2: parcial  │
  │                   │                      │                       │                          │
  │                   │◄─ Refresca datos ────│◄─ Obtiene datos ─────│ (automático)             │
  │                   │                      │  calendarios_pagos    │                          │
  │                   │  Muestra actualizado │  pagos_realizados     │                          │
  │ ✅ Pago registrado│                      │                       │                          │
  │                   │                      │                       │                          │
```

**Resultado final (sin código adicional):**
- ✅ `pagos_realizados` tiene el registro
- ✅ `clientes.total_pagado` = 150 (actualizado)
- ✅ `clientes.saldo` = precio - descuento - 150 (recalculado automáticamente)
- ✅ `calendarios_pagos` cuota 1 = pagada (saldo $0)
- ✅ `calendarios_pagos` cuota 2 = parcialmente_pagado (saldo $50)

---

### Reporte: Cobranza por Gestor
```
SELECT 
  g.nombre,
  COUNT(DISTINCT pr.cliente_id) as clientes_cobrados,
  SUM(pr.monto_pagado) as total_cobrado,
  COUNT(pr.id) as numero_pagos
FROM pagos_realizados pr
JOIN gestores g ON pr.gestor_id = g.id
GROUP BY g.id, g.nombre
```

### Reporte: Clientes Morosos
```
SELECT 
  c.nombre_completo,
  SUM(cp.saldo_pendiente) as saldo_pendiente,
  MAX(cp.fecha_programada) as ultima_fecha_pagada
FROM clientes c
JOIN calendarios_pagos cp ON c.id = cp.cliente_id
WHERE cp.estado != 'pagado'
GROUP BY c.id
HAVING SUM(cp.saldo_pendiente) > 0
ORDER BY SUM(cp.saldo_pendiente) DESC
```

---

## 🚀 Roadmap de Implementación

1. ✅ Crear migración SQL (005_nueva_estructura_pagos.sql)
   - ✅ Tablas: calendarios_pagos, pagos_realizados
   - ✅ Vista: v_resumen_pagos_cliente
   - ✅ Triggers: 6 triggers automáticos
   
2. ✅ Actualizar tipos TypeScript
   - ✅ CalendarioPago
   - ✅ PagoRealizado
   
3. ⏳ Crear hooks (usePagos.ts actualizado)
   - Función simple: registrarPagoRealizado() - SIMPLE THANKS TO TRIGGERS
   - Función: obtenerCalendarioPagos()
   - Función: obtenerPagosRealizados()
   - Función: editarPagoRealizado()
   - Función: obtenerResumenCliente() (desde vista)
   
4. ⏳ Actualizar componentes (CAMBIOS MÍNIMOS)
   - CalendarioPagos.tsx - Usa calendarios_pagos en lugar de pagos
   - ModalRegistrarPago.tsx - Usa pagos_realizados (simple INSERT)
   - ResumenCobranza.tsx - Usa v_resumen_pagos_cliente
   
5. ⏳ Crear validaciones nuevas
   - validations/calendario-pago.ts
   - validations/pago-realizado.ts
   
6. ⏳ Tests

**NOTA:** Gracias a los TRIGGERS, el trabajo de código TypeScript se reduce ~60% porque la base de datos maneja la sincronización automáticamente.

---

## 🎯 Ventajas de Usar TRIGGERS (vs Lógica Manual en TypeScript)

### ❌ Riesgo SIN TRIGGERS

```typescript
// TypeScript manual (ERROR-PRONE)
const registrarPago = async (cliente_id, monto) => {
  // 1. Insertar pago
  const pago = await insertarPago(cliente_id, monto)
  
  // 2. Actualizar total_pagado
  await actualizarCliente_TotalPagado(cliente_id, monto)
  
  // 3. Buscar cuota pendiente
  const cuota = await obtenerCuotaPendiente(cliente_id)
  
  // 4. Actualizar saldo
  await actualizarCuota_Saldo(cuota.id, cuota.saldo - monto)
  
  // 5. Verificar si liquidado
  const cliente = await obtenerCliente(cliente_id)
  if (cliente.saldo <= 0) {
    await actualizarCliente_Estado(cliente_id, 'liquidado')
  }
  
  // ⚠️ PROBLEMAS:
  // - ¿Qué pasa si la conexión se cae en paso 3?
  // - ¿Qué pasa si alguien hace INSERT directo en BD sin pasar por TypeScript?
  // - ¿Qué pasa si la lógica cambia?
}
```

### ✅ Seguro CON TRIGGERS

```typescript
// TypeScript simple y seguro (FAIL-PROOF)
const registrarPago = async (cliente_id, monto) => {
  // Solo 1 INSERT
  const pago = await supabase
    .from('pagos_realizados')
    .insert({ cliente_id, monto_pagado: monto })
  
  // ✅ TRIGGERS automáticamente:
  // - Actualizan clientes.total_pagado
  // - Actualizan calendarios_pagos.saldo_pendiente
  // - Cambian estado de cuota
  // - Verifican si cliente está liquidado
  
  return pago
}
```

### Ventajas de TRIGGERS

| Aspecto | Sin Triggers | Con Triggers |
|---------|------------|------------|
| **Consultas por pago** | 5-6 queries | 1 query ✅ |
| **Consistencia** | Manual | Automática ✅ |
| **Inserts directos** | Rompen lógica ⚠️ | Funcionan bien ✅ |
| **Concurrencia** | Race conditions ⚠️ | Seguro ✅ |
| **Código TypeScript** | Complejo | Simple ✅ |
| **Edits/Deletes** | Mantenimiento | Automático ✅ |
| **Cambios futuros** | Afecta a código | Solo SQL ✅ |

---

**P: ¿Qué pasa si un cliente paga más de lo debido?**  
R: Se registra en `pagos_realizados` como es. El sistema lo aplica a las cuotas pendientes por orden FIFO.

**P: ¿Cómo se calcula el total_pagado del cliente?**  
R: `SUM(pagos_realizados.monto_pagado) WHERE cliente_id = X`

**P: ¿Se puede editar un pago realizado?**  
R: Sí, pero se sugiere registrar un "ajuste" en lugar de editar.

**P: ¿Se puede eliminar un pago?**  
R: Mejor no permitirlo. Si hay error, crear un "abono" negativo.

**P: ¿Qué pasa con la tabla `pagos` antigua?**  
R: Se migran los datos a las nuevas tablas o se deja como legacy (no se usa más).

