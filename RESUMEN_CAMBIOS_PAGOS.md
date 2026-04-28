# 📋 Resumen de Cambios - Nueva Estructura de Pagos

## ✅ Lo que hemos creado

### 1. 🗄️ Migración SQL (005_nueva_estructura_pagos.sql)

**Tablas nuevas:**
- `calendarios_pagos` - Plan de cobro (qué días cobrar)
- `pagos_realizados` - Registro de pagos (lo que realmente se pagó)

**Índices:**
- 6 índices para optimizar queries

**Vista (Virtual Table):**
- `v_resumen_pagos_cliente` - Dashboard consolidado por cliente

**Triggers (Automáticos):**
- `trg_pagos_realizados_insert` - Actualiza total_pagado al INSERT
- `trg_pagos_realizados_update` - Recalcula al UPDATE
- `trg_pagos_realizados_delete` - Resta al DELETE
- `trg_actualizar_calendario_pago` - Actualiza cuotas pendientes

**Total:** 4 tablas/vistas + 6 triggers + 6 índices

---

### 2. 📝 Tipos TypeScript (src/types/index.ts)

**Nuevas interfaces:**
```typescript
interface CalendarioPago {
  id: string
  cliente_id: string
  numero_cuota: number
  fecha_programada: string
  monto_programado: number
  estado: 'pendiente' | 'parcialmente_pagado' | 'pagado'
  saldo_pendiente: number
  notas?: string
  created_at: string
  updated_at: string
}

interface PagoRealizado {
  id: string
  cliente_id: string
  gestor_id?: string
  fecha_pago: string
  monto_pagado: number  // FLEXIBLE
  notas?: string
  created_at: string
}
```

**Tipos:**
- `EstadoCalendarioPago`
- `EstadoPago` (legacy - ahora deprecated)

---

### 3. 📖 Documentación (NUEVA_ESTRUCTURA_PAGOS.md)

**Secciones incluidas:**
- Resumen de cambios
- Sincronización automática (TRIGGERS)
- Estructura de datos detallada
- Flujos de operación completos
- Casos prácticos (pago exacto, parcial, exceso, adelanto)
- Cambios en lógica de negocio
- Cambios en componentes
- Validaciones
- Permisos
- Vistas y reportes
- Roadmap de implementación
- Ventajas de triggers
- FAQ

---

## 🔄 Cómo Funciona Ahora

### ANTES (Viejo)
```
pagos
├─ id
├─ cliente_id
├─ numero_pago
├─ fecha_programada
├─ monto_programado
├─ monto_pagado
├─ estado
└─ ... (todo mezclado)

Lógica: Manual en TypeScript
```

### AHORA (Nuevo)
```
calendarios_pagos (Plan)     pagos_realizados (Registro)      clientes (Sincronizado)
├─ id                        ├─ id                              ├─ total_pagado ✅
├─ cliente_id                ├─ cliente_id                      ├─ saldo ✅
├─ numero_cuota              ├─ fecha_pago                      └─ estado ✅
├─ fecha_programada          ├─ monto_pagado
├─ monto_programado          ├─ gestor_id
├─ estado ✅ (TRIGGER)       └─ notas
├─ saldo_pendiente ✅        
└─ ...                       Lógica: AUTOMÁTICA (TRIGGERS)
```

---

## 📊 Vista: v_resumen_pagos_cliente

Resumen en 1 fila por cliente:

```
cliente_id | nombre | total_programado | total_pagado | saldo_pendiente | cuotas_pagadas/total
cli-001    | Juan   | $400             | $300         | $100            | 2/4
cli-002    | María  | $500             | $0           | $500            | 0/5
```

---

## 🚀 Próximos Pasos

Para implementar completamente, necesitamos:

1. **Migración en Supabase**
   - Ejecutar: `005_nueva_estructura_pagos.sql`

2. **Actualizar hooks** (`src/hooks/usePagos.ts`)
   - `obtenerCalendarioPagos(clienteId)`
   - `obtenerPagosRealizados(clienteId)`
   - `registrarPagoRealizado(clienteId, input)` ← SIMPLE gracias a triggers
   - `editarPagoRealizado(pagoId, input)`
   - `obtenerResumenCliente(clienteId)` ← desde vista

3. **Actualizar componentes**
   - `CalendarioPagos.tsx` - Mostrar datos de calendarios_pagos
   - `ModalRegistrarPago.tsx` - Registrar en pagos_realizados
   - `ResumenCobranza.tsx` - Usar v_resumen_pagos_cliente

4. **Crear validaciones**
   - `src/validations/calendario-pago.ts`
   - `src/validations/pago-realizado.ts`

5. **Migrar datos** (si hay datos viejos)
   - Copiar de tabla `pagos` antigua a nuevas tablas

---

## 💡 Puntos Clave

✅ **Separación clara**: Calendario (plan) vs Pagos (registro)

✅ **Flexibilidad**: Los clientes pueden pagar CUALQUIER monto

✅ **Automatización**: TRIGGERS manejan la sincronización

✅ **Auditoría**: Cada pago es un registro editable

✅ **Performance**: 6 índices + vista materializable

✅ **Seguridad**: Constraints y triggers aseguran consistencia

✅ **Simplicidad**: Código TypeScript mucho más simple

---

## ⚠️ Migraciones Necesarias en Supabase

1. ✅ `001_init_schema.sql` (ya existe)
2. ✅ `002_add_auth_id.sql` (ya existe)
3. ✅ `003_add_empresa_fields.sql` (ya existe)
4. ✅ `004_add_intento_pago.sql` (ya existe)
5. 🆕 `005_nueva_estructura_pagos.sql` (NUEVA - crear tablas, vista, triggers)
6. ⏳ `006_migrar_datos_pagos.sql` (OPCIONAL - si hay datos viejos)

---

## 📞 Preguntas de Implementación

**P: ¿Puedo usar la tabla `pagos` antigua mientras migro?**
R: Sí, ambas pueden coexistir. Los triggers solo afectan a `pagos_realizados`.

**P: ¿Se pueden editar/eliminar pagos?**
R: Sí. Editar actualiza el monto (trigger recalcula). Eliminar resta el monto (trigger recalcula).

**P: ¿Qué pasa con los datos viejos?**
R: Se pueden migrar con una query INSERT ... SELECT, o dejar la tabla antigua como histórico.

**P: ¿Se calcula automáticamente el estado "liquidado"?**
R: Sí, cuando `clientes.saldo <= 0` (porque `saldo` es GENERATED ALWAYS).

**P: ¿Los triggers funcionan si inserto desde Supabase Studio?**
R: Sí, los triggers se ejecutan siempre, sin importar de dónde viene el INSERT.

