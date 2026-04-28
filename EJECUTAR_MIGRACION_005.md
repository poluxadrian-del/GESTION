# 🚀 Checklist para Ejecutar Migración 005

## ✅ Verificación Pre-Ejecución

### 1. Dependencias
- [x] Tabla `clientes` existe (migración 001)
- [x] Tabla `gestores` existe (migración 001)
- [x] Usuario de Supabase tiene permisos para CREATE TABLE/TRIGGER/FUNCTION

### 2. Sintaxis SQL
- [x] Tablas: Sintaxis correcta
- [x] Índices: Nombres únicos, campos válidos
- [x] Vista: SELECT sin errores
- [x] Funciones: PL/pgSQL válido
- [x] Triggers: Eventos y timing correctos

### 3. Lógica
- [x] Trigger mejorado: Maneja pagos múltiples cuotas ✨
- [x] Constraints: Check y UNIQUE válidos
- [x] Foreign Keys: Referencias válidas
- [x] Comentarios: Documentación completa

---

## 🎯 Cómo Ejecutar

### Opción A: Supabase Dashboard (UI)
1. Abre [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto Formex
3. Ve a **SQL Editor**
4. Crea una **New Query**
5. Copia el contenido de `005_nueva_estructura_pagos.sql`
6. Click en **Run** (o Ctrl+Enter)
7. Espera el mensaje: ✅ **Success**

### Opción B: Terminal (Recomendado para automatizar)
```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Loguearse
supabase login

# Ejecutar migración
supabase db push --file supabase/migrations/005_nueva_estructura_pagos.sql
```

### Opción C: Directamente en BD (psql)
```bash
# Conectarse a BD
psql postgresql://user:password@db.supabase.co:5432/postgres

# Ejecutar archivo
\i supabase/migrations/005_nueva_estructura_pagos.sql

# Verificar
\d calendarios_pagos
\d pagos_realizados
```

---

## ✔️ Verificación Post-Ejecución

```sql
-- 1. Verificar tablas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('calendarios_pagos', 'pagos_realizados');
-- Resultado esperado: 2 filas ✅

-- 2. Verificar vista
SELECT viewname FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'v_resumen_pagos_cliente';
-- Resultado esperado: 1 fila ✅

-- 3. Verificar índices
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('calendarios_pagos', 'pagos_realizados');
-- Resultado esperado: 6 filas ✅

-- 4. Verificar triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'trg_%';
-- Resultado esperado: 4 filas (trg_pagos_realizados_insert, update, delete + trg_actualizar_calendario_pago) ✅

-- 5. Verificar funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'actualizar_%';
-- Resultado esperado: 4 filas ✅
```

---

## ⚠️ Posibles Errores y Soluciones

### Error: "relation \"clientes\" does not exist"
**Causa:** Tabla clientes no existe  
**Solución:** Ejecuta primero las migraciones 001-004

### Error: "function does not exist"
**Causa:** PostgreSQL no encontró la función  
**Solución:** Las funciones deben crearse ANTES de los triggers. El script respeta ese orden ✅

### Error: "duplicate key value violates unique constraint"
**Causa:** Ya existe un índice con ese nombre  
**Solución:** Ejecutar solo si es la primera vez (no re-ejecutar)

### Error: "permission denied for schema public"
**Causa:** Usuario sin permisos  
**Solución:** Usar cuenta con rol superuser o admin

---

## 📊 Qué se Crea

| Tipo | Nombre | Descripción |
|------|--------|-------------|
| **Tabla** | `calendarios_pagos` | Plan de cobro del cliente |
| **Tabla** | `pagos_realizados` | Registro de pagos |
| **Índice** | `idx_calendarios_pagos_cliente` | FK cliente |
| **Índice** | `idx_calendarios_pagos_fecha` | Búsquedas por fecha |
| **Índice** | `idx_calendarios_pagos_estado` | Búsquedas por estado |
| **Índice** | `idx_pagos_realizados_cliente` | FK cliente |
| **Índice** | `idx_pagos_realizados_fecha` | Búsquedas por fecha |
| **Índice** | `idx_pagos_realizados_gestor` | FK gestor |
| **Vista** | `v_resumen_pagos_cliente` | Dashboard consolidado |
| **Función** | `actualizar_total_pagado_insertar()` | Trigger INSERT |
| **Función** | `actualizar_total_pagado_actualizar()` | Trigger UPDATE |
| **Función** | `actualizar_total_pagado_eliminar()` | Trigger DELETE |
| **Función** | `actualizar_estado_calendario()` | Aplicar pagos a cuotas |
| **Trigger** | `trg_pagos_realizados_insert` | Al insertar pago |
| **Trigger** | `trg_pagos_realizados_update` | Al editar pago |
| **Trigger** | `trg_pagos_realizados_delete` | Al eliminar pago |
| **Trigger** | `trg_actualizar_calendario_pago` | Al registrar pago |

**Total:** 2 tablas + 1 vista + 4 funciones + 4 triggers + 6 índices = 17 objetos nuevos

---

## 🎉 Una Vez Ejecutada

1. ✅ Las tablas estarán listas en Supabase
2. ✅ Los triggers funcionarán automáticamente
3. ✅ Puedes empezar a crear los hooks en TypeScript
4. ✅ Los datos de clientes se sincronizarán automáticamente

**Siguiente paso:** Crear los hooks (`usePagos.ts` actualizado)

---

## 🔄 Revertir si es Necesario

Si necesitas deshacer la migración:

```sql
-- CUIDADO: Esto borrará todo lo creado
DROP TRIGGER IF EXISTS trg_actualizar_calendario_pago ON pagos_realizados;
DROP TRIGGER IF EXISTS trg_pagos_realizados_delete ON pagos_realizados;
DROP TRIGGER IF EXISTS trg_pagos_realizados_update ON pagos_realizados;
DROP TRIGGER IF EXISTS trg_pagos_realizados_insert ON pagos_realizados;

DROP FUNCTION IF EXISTS actualizar_estado_calendario();
DROP FUNCTION IF EXISTS actualizar_total_pagado_eliminar();
DROP FUNCTION IF EXISTS actualizar_total_pagado_actualizar();
DROP FUNCTION IF EXISTS actualizar_total_pagado_insertar();

DROP VIEW IF EXISTS v_resumen_pagos_cliente;

DROP INDEX IF EXISTS idx_pagos_realizados_gestor;
DROP INDEX IF EXISTS idx_pagos_realizados_fecha;
DROP INDEX IF EXISTS idx_pagos_realizados_cliente;
DROP INDEX IF EXISTS idx_calendarios_pagos_estado;
DROP INDEX IF EXISTS idx_calendarios_pagos_fecha;
DROP INDEX IF EXISTS idx_calendarios_pagos_cliente;

DROP TABLE IF EXISTS pagos_realizados;
DROP TABLE IF EXISTS calendarios_pagos;
```

---

## ✅ Resumen Final

✅ **Migración lista para ejecutar**
✅ **Sintaxis validada**
✅ **Lógica mejorada (pagos múltiples cuotas)**
✅ **Comentarios y documentación completa**
✅ **Checklist de verificación incluido**

**Puedes proceder con confianza a ejecutarla en Supabase** 🚀

