# 🧪 PLAN DE TESTING LOCAL - Nuevo Sistema de Pagos

## ✅ Estado Actual
- ✅ Servidor Vite corriendo en http://localhost:5173/
- ✅ No hay errores de compilación
- ✅ CalendarioPagos.v2.tsx integrado
- ✅ ModalRegistrarPagoRealizado.tsx listo
- ✅ Triggers en Supabase activos

---

## 📋 Checklist de Testing

### Fase 1: Verificación Preliminar
- [ ] App carga correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Login funciona
- [ ] Redirección a Clientes funciona

### Fase 2: Visualización Inicial
- [ ] **ClientesPage** carga lista de clientes
- [ ] Clientes muestran: nombre, teléfono, ubicación
- [ ] Los campos calculados (`saldo`, `total_pagado`) se muestran correctamente

### Fase 3: Abrir Calendario de Pagos
- [ ] Click en un cliente abre modal
- [ ] Tab "Calendario de Pagos" muestra:
  - [ ] Lista de cuotas (`numero_cuota`)
  - [ ] `fecha_programada`
  - [ ] `monto_programado`
  - [ ] **`saldo_pendiente`** (NUEVO CAMPO)
  - [ ] Estado visual (rojo=pendiente, amarillo=parcial, verde=pagado)
- [ ] Resumen en la parte superior:
  - [ ] Total Programado (suma de `monto_programado`)
  - [ ] Total Pagado Realizado (suma de `pagos_realizados`)
  - [ ] Total Saldo Pendiente (resta)

### Fase 4: Registrar un Pago (CRÍTICO)

#### Paso 1: Abrir Modal
- [ ] Click en botón [+] de una cuota abre `ModalRegistrarPagoRealizado`
- [ ] Modal muestra información de la cuota:
  - Número de cuota
  - Monto programado
  - **Saldo pendiente** (propuesta inicial en monto_pagado)
  - Fecha programada

#### Paso 2: Llenar Formulario
- [ ] Campo "Fecha de Pago" funciona (calendario)
- [ ] Campo "Monto Pagado" permite entrar cualquier cantidad
- [ ] **IMPORTANTE**: Cambiar monto a un valor diferente al `saldo_pendiente`
  - Ej: Si saldo_pendiente = $100, pagar $150 (para probar exceso)
- [ ] Selector "Gestor" carga correctamente
- [ ] Campo "Notas" permite texto

#### Paso 3: Validar Antes de Enviar
- [ ] Mensaje info muestra: "✅ Automático: Los triggers actualizarán..."
- [ ] Campos requeridos están marcados con *

#### Paso 4: Registrar Pago
- [ ] Click [Registrar Pago]
- [ ] Toast aparece: "Pago de $XXX registrado exitosamente"
- [ ] Modal se cierra automáticamente

### Fase 5: Verificar Actualización (TRIGGER TEST) ⚡

Después de registrar el pago, **dentro de 2-3 segundos**, verificar:

#### 5a: En CalendarioPagos.v2 (Frontend)
- [ ] Tabla se refresca mostrando nueva cuota con:
  - [ ] Cuota 1 (pagada con $100): `saldo_pendiente` = 0, estado = **verde** (pagado)
  - [ ] Cuota 2 (si pagaste $150, debe tener $50): `saldo_pendiente` = 50, estado = **amarillo** (parcialmente_pagado)
  - [ ] Cuota 3+: Sin cambios, estado = **rojo** (pendiente)

#### 5b: En Resumen (Frontend)
- [ ] Total Pagado Realizado: aumentó en $150
- [ ] Total Saldo Pendiente: disminuyó en $150
- [ ] Cuotas Pagadas: aumentó (si aplica)

#### 5c: En BD (Supabase Dashboard) - VERIFICACIÓN MANUAL
```sql
-- Ejecutar en Supabase SQL Editor:
SELECT * FROM pagos_realizados 
ORDER BY created_at DESC LIMIT 1;

SELECT * FROM calendarios_pagos 
WHERE cliente_id = '...'
ORDER BY numero_cuota ASC;

SELECT * FROM clientes 
WHERE id = '...' 
LIMIT 1;
```

**Esperado:**
- `pagos_realizados`: 1 fila con tu pago (monto_pagado = $150)
- `calendarios_pagos.numero_cuota = 1`: estado = 'pagado', saldo_pendiente = 0
- `calendarios_pagos.numero_cuota = 2`: estado = 'parcialmente_pagado', saldo_pendiente = 50
- `clientes.total_pagado`: incrementó en $150

### Fase 6: Testing Adicional (Opcional)

#### 6a: Pago Exacto
- [ ] Registrar pago igual al saldo_pendiente
- [ ] Verificar que cuota pasa a estado "pagado"
- [ ] Siguientes cuotas sin cambios

#### 6b: Pago Parcial
- [ ] Registrar pago menor al saldo_pendiente (ej: $30 de $100)
- [ ] Verificar que cuota pasa a estado "parcialmente_pagado"
- [ ] saldo_pendiente se reduce (ej: $70)
- [ ] Siguientes cuotas sin cambios

#### 6c: Múltiples Pagos
- [ ] Registrar 2 pagos en la misma cuota
- [ ] Verificar acumulación de montos
- [ ] Verificar que saldo_pendiente se descuenta correctamente

#### 6d: Pago en Cuota Diferente
- [ ] Cambiar de cliente
- [ ] Registrar pago en otro cliente
- [ ] Verificar que no afecta datos del cliente anterior

---

## 🔴 ERRORES A VIGILAR

### Error: "No tienes permisos para registrar pagos"
- **Causa**: Rol del usuario es `supervisor`
- **Solución**: Login con rol que no sea supervisor

### Error: "Error al registrar pago"
- **Causa**: Validación falla o Supabase rechaza
- **Solución**: Revisar consola del navegador (F12 → Console)

### Error: "Gestor no carga en selector"
- **Causa**: `obtenerGestores()` falla
- **Solución**: Verificar que tabla `gestores` existe y tiene datos

### Calendarios no se refrescan después del pago
- **Causa**: Triggers no ejecutaron o `loadCalendarios()` no fue llamado
- **Solución**: Revisar console en Supabase para errores en triggers

### Saldo pendiente sigue igual
- **Causa**: Trigger `trg_actualizar_calendario_pago` no ejecutó
- **Solución**: Ir a Supabase → Functions → Revisar logs de triggers

---

## 📱 Pasos Rápidos

```
1. Ir a http://localhost:5173/
2. Login (usuario con permisos)
3. Click en "Clientes"
4. Click en un cliente
5. Ver "Calendario de Pagos"
6. Click [+] en una cuota
7. Llenar ModalRegistrarPagoRealizado
8. Click [Registrar Pago]
9. Verificar que se actualice ✅
```

---

## 💡 Tips para Testing

- **F12 en el navegador** para ver consola (errores)
- **Network tab** para ver requests a Supabase
- **En Supabase**: Ir a Logs → Functions para ver salida de triggers
- **Refresco manual**: F5 si necesitas verificar que datos persisten

---

## 🎯 Criterio de Éxito

✅ **TESTING EXITOSO SI:**
1. Pago se registra sin errores
2. Toast de éxito aparece
3. Tabla se refresca automáticamente
4. `saldo_pendiente` disminuye
5. Estado de cuota cambia (pendiente → parcial/pagado)
6. `clientes.total_pagado` se actualiza
7. No hay errores en consola

❌ **TESTING FALLA SI:**
1. Modal no se abre
2. Validación rechaza datos válidos
3. Pago no se registra
4. Datos no se refrescan
5. Trigger no ejecuta (saldo_pendiente no cambia)

---

## 📊 Escenarios de Testing

### Escenario A: Cliente con 3 cuotas de $100 cada una
```
Pagar $250 (excedera la primera cuota)
  ↓
Cuota 1: $100 → saldo=0, estado=pagado
Cuota 2: $100 → saldo=50, estado=parcial
Cuota 3: $100 → saldo=100, estado=pendiente
Total pagado: $250 ✅
```

### Escenario B: Cliente con 1 cuota de $200
```
Pagar $150 (menos del total)
  ↓
Cuota 1: $200 → saldo=50, estado=parcial
Total pagado: $150 ✅
```

### Escenario C: Pago exacto
```
Pagar $100 en cuota de $100
  ↓
Cuota 1: $100 → saldo=0, estado=pagado
Total pagado: $100 ✅
```

---

## ⏱️ Tiempo Esperado

- Setup: < 5 min
- Registrar 1 pago: 2-3 min
- Verificación de datos: 2-3 min
- Testing adicional: 10-15 min
- **Total: ~20-30 min**

---

## 📝 Documentar Resultados

Después del testing, anota:
- ✅ Qué funcionó bien
- ❌ Qué falló
- 🔴 Errores encontrados
- 💡 Mejoras sugeridas

```markdown
## Resultados Testing [FECHA]

### ✅ Funciona Correctamente
- [ ] 
- [ ]

### ❌ Problemas Encontrados
- [ ] 
- [ ]

### 🔴 Errores
[Pegar output de consola]

### 💡 Notas
[Observaciones y mejoras]
```

---

## 🚀 Siguiente Fase (Después de Testing)

Si todo funciona:
1. ✅ ResumenCobranza.tsx - Mostrar consolidado
2. ✅ PagosTable.tsx - Histórico de pagos
3. ✅ Deploy a producción
4. ✅ Training de usuarios

---

## ¿Listo?

Abre http://localhost:5173/ en el navegador y comienza el testing 🧪
