# 🗑️ Plan: Eliminar Tabla `pagos` Antigua

## Estado Actual

### Archivos que TODAVÍA usan tabla `pagos` vieja:

1. **src/hooks/usePagos.ts**
   - `obtenerPagosPorCliente()` - ❌ NO SE USA (CalendarioPagos.tsx no se usa)
   - `registrarPago()` - ❌ NO SE USA
   - `editarPago()` - ❌ NO SE USA
   - `eliminarPago()` - ❌ NO SE USA
   - `generarPagosCliente()` - ❌ NO SE USA
   - Otros 10+ funciones antiguas - ❌ NO SE USAN

2. **src/hooks/useClientes.ts**
   - `generarCalendarioPagosCliente()` - ✅ SE USA (en ClientesPage)
   - Otra que usa tabla `pagos` - ❌ NO SE USA

3. **src/hooks/useReportes.ts**
   - Funciones que leen tabla `pagos` - ❌ Verificar si se usan

4. **src/components/clientes/CalendarioPagos.tsx**
   - ❌ COMPONENTE ANTIGUO - NO SE USA (usamos v2)

5. **src/components/cobranza/PagosTable.tsx** (si existe)
   - Posiblemente use tabla `pagos` - ⏳ REVISAR

---

## ✅ Lo que SÍ está funcionando

- ✅ CalendarioPagos.v2.tsx (usa `calendarios_pagos` + `pagos_realizados`)
- ✅ ModalRegistrarPagoRealizado.tsx (usa `pagos_realizados`)
- ✅ usePagos.ts nuevas funciones:
  - `obtenerCalendarioPagos()`
  - `obtenerResumenCliente()`
  - `registrarPagoRealizado()`
  - `editarPagoRealizado()`
  - `eliminarPagoRealizado()`

---

## 📋 Plan de Eliminación (5 Pasos)

### Paso 1: Limpiar usePagos.ts
**Acción:** Eliminar TODAS las funciones antiguas que usan tabla `pagos`

Funciones a ELIMINAR:
```typescript
- obtenerPagosPorCliente()
- registrarPago()
- editarPago()
- eliminarPago()
- generarPagosCliente()
- obtenerMontoPagadoPorCliente()
- validarEstadoPago()
- [cualquier otra que use tabla pagos]
```

Funciones a MANTENER:
```typescript
- obtenerCalendarioPagos()
- obtenerResumenCliente()
- obtenerPagosRealizados()
- registrarPagoRealizado()
- editarPagoRealizado()
- eliminarPagoRealizado()
```

**Líneas estimadas:** Eliminar ~400 líneas antiguas

### Paso 2: Actualizar useClientes.ts
**Acción:** Revisar `generarCalendarioPagosCliente()`

- Si genera cuotas desde tabla `pagos` vieja → REEMPLAZAR con `calendarios_pagos`
- Si ya genera en tabla nueva → DEJAR COMO ESTÁ

### Paso 3: Revisar useReportes.ts
**Acción:** Verificar qué reportes leen tabla `pagos`

Opciones:
- Si reportes aún se usan → Actualizar para leer `calendarios_pagos` + `pagos_realizados`
- Si no se usan → Eliminar funciones antiguas

### Paso 4: Eliminar Componente Antiguo
**Acción:** Eliminar `src/components/clientes/CalendarioPagos.tsx`

Confirmación:
- ✅ ClientesPage.tsx usa CalendarioPagos.v2.tsx
- ✅ No hay otras referencias a CalendarioPagos.tsx antiguo
- ✅ Podemos borrar sin problemas

### Paso 5: Eliminar Tabla en Supabase
**Acción:** Ejecutar en Supabase SQL Editor:

```sql
-- Crear respaldo antes de eliminar (OPCIONAL)
-- CREATE TABLE pagos_backup AS SELECT * FROM pagos;

-- Eliminar tabla
DROP TABLE IF EXISTS pagos CASCADE;

-- Nota: Usar CASCADE para eliminar también any triggers/constraints
```

---

## ⚠️ Antes de Ejecutar

### Checklist de Seguridad

- [ ] ¿Se ejecutó migración 007 (corregir vista)?
- [ ] ¿Se verificó que CalendarioPagos.v2.tsx está funcionando?
- [ ] ¿Se confirmó que no hay otros componentes usando tabla `pagos`?
- [ ] ¿Tenemos backup de datos (opcional)?
- [ ] ¿El equipo está de acuerdo en eliminar tabla vieja?

---

## 🔄 Orden Recomendado de Ejecución

```
1. Eliminar funciones antiguas de usePagos.ts (frontend)
   ↓
2. Actualizar useClientes.ts si es necesario (frontend)
   ↓
3. Revisar/Actualizar useReportes.ts (frontend)
   ↓
4. Eliminar CalendarioPagos.tsx (frontend)
   ↓
5. Refrescar app (npm run dev) - verificar que no hay errores
   ↓
6. Ejecutar DROP TABLE pagos en Supabase (BD)
   ↓
7. Testing completo en app
   ↓
8. Deploy a producción
```

---

## Impacto Estimado

### Líneas de Código a Eliminar
- ~400 líneas en usePagos.ts (funciones antiguas)
- ~500 líneas en CalendarioPagos.tsx
- ~50 líneas en useReportes.ts (si aplica)
- **Total: ~950 líneas**

### Archivos a Tocar
- `src/hooks/usePagos.ts` - MODIFICAR (eliminar funciones)
- `src/hooks/useClientes.ts` - REVISAR (posible modificación)
- `src/hooks/useReportes.ts` - REVISAR (posible modificación)
- `src/components/clientes/CalendarioPagos.tsx` - ELIMINAR
- Supabase BD - EJECUTAR DROP TABLE

### Beneficios
✅ Código más limpio
✅ Menos código muerto
✅ Base de datos más simple
✅ Menos confusión sobre qué tabla usar
✅ Una única fuente de verdad (calendarios_pagos + pagos_realizados)

---

## Caso de Reversión (en caso de problema)

Si algo falla:

1. **Frontend:** Los cambios son fáciles de revertir (git checkout)
2. **Supabase:** Si ejecutaste DROP TABLE, RESTAURAR la tabla:
   ```sql
   -- Si tienes backup
   DROP TABLE pagos;
   CREATE TABLE pagos_backup AS ... (restaurar desde backup)
   ```

---

## 📊 Resumen

| Acción | Estado | Riesgo |
|--------|--------|--------|
| Eliminar funciones viejas de usePagos.ts | ✅ SEGURO | Bajo (frontend) |
| Eliminar CalendarioPagos.tsx | ✅ SEGURO | Bajo (ya reemplazado) |
| Actualizar useReportes.ts | ⏳ REVISAR | Medio (verificar uso) |
| DROP TABLE pagos | ⚠️ CRÍTICO | Alto (irreversible) |

---

## ¿Listo?

¿Ejecutamos el plan completo ahora?

**Recomendación:** Empezar por frontend (Pasos 1-4), verificar que todo funciona, y LUEGO ejecutar DROP TABLE en Supabase (Paso 5).
