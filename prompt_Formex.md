# Prompt: Sistema de Gestión  v3 — 

## Rol y contexto

Eres un desarrollador full-stack senior especializado en aplicaciones de gestión empresarial.
Debes construir una aplicación web completa para una pequeña empresa **cursos de informática**
a crédito. Los clientes tienen un único contrato con pagos en frecuencia semanal, quincenal o mensual
hasta 18 meses. La aplicación es para una sola empresa — no es multi-tenant.

---

## Stack tecnológico

- **Frontend:** React 18 + TypeScript + Vite
- **Estilos:** Tailwind CSS + shadcn/ui
- **Backend / Base de datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth (email/password + roles)
- **ORM / Queries:** Supabase JS Client v2
- **Estado global:** Zustand
- **Formularios:** React Hook Form + Zod (validación)
- **Tablas:** TanStack Table v8 (con useMemo en columnas y datos filtrados)
- **Gráficas:** Recharts
- **Exportación:** xlsx
- **Notificaciones:** react-hot-toast
- **Enrutamiento:** React Router v6

---

## Arquitectura del proyecto

```
src/
├── components/
│   ├── ui/               # Componentes base (shadcn)
│   ├── layout/           # Sidebar, Topbar, Layout general
│   ├── clientes/         # Componentes del módulo clientes
│   ├── cobranza/         # Componentes del módulo cobranza
│   ├── gestores/         # Componentes del módulo gestores
│   └── dashboard/        # Widgets y métricas
├── pages/                # Una página por módulo
├── hooks/                # Custom hooks con useCallback para evitar loops
├── stores/               # Zustand stores
├── lib/
│   ├── supabase.ts       # Cliente Supabase
│   └── utils.ts          # Helpers y formateadores
├── types/                # Tipos TypeScript globales
└── validations/          # Schemas Zod
```

---

## Esquema de base de datos (Supabase / PostgreSQL)

**Nota importante:** La aplicación es para una sola empresa. No existe tabla `empresas`
ni campo `empresa_id` en ninguna tabla. Las políticas RLS se basan únicamente en roles de usuario.

### `usuarios`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Vinculado a auth.users |
| nombre_completo | text | |
| email | text | |
| rol | enum('socio','admin','supervisor') | |
| activo | boolean DEFAULT true | |
| created_at | timestamptz | |

**Roles y permisos:**
- **Socio** — acceso total, puede editar cualquier campo de la base de datos
- **Admin** — puede ver todo, crear/editar clientes y pagos, acceso a todos los reportes
- **Supervisor** — solo lectura en todo el sistema + puede editar seguimientos

### `gestores`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| nombre | text NOT NULL | Nombre del gestor |
| activo | boolean DEFAULT true | |
| created_at | timestamptz | |

**Nota:** Los gestores NO tienen acceso al sistema. Son entidades asignables a clientes.
En cualquier momento un cliente puede cambiar de gestor, pero en los pagos queda registro
del gestor que cobró cada pago específico.

### `clientes`
**Nota:** La tabla clientes incluye los campos del contrato ya que cada cliente tiene un único contrato.

| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| numero_contrato | text UNIQUE | Folio autogenerado por el sistema (ej: CLI-2025-0001) |
| **— Datos personales —** | | |
| gestor_id | uuid (FK → gestores) | Gestor actual asignado |
| nombre_completo | text NOT NULL | |
| telefono_celular | text | |
| email | text | |
| ubicacion | text | Ciudad/municipio/estado en un solo campo |
| ref_nombre | text | Nombre de referencia personal |
| ref_telefono | text | Teléfono de referencia personal |
| **— Datos del contrato —** | | |
| fecha_inicio | date | Fecha de inicio del contrato |
| precio_venta | numeric(15,2) | Precio original de venta|
| descuento | numeric(15,2) DEFAULT 0 | Descuento aplicado — mantiene registro del valor |
| total_pagado | numeric(15,2) DEFAULT 0 | Suma acumulada de pagos recibidos |
| saldo | numeric(15,2) | precio_venta - descuento - total_pagado |
| meses_pagados | integer | total_pagado / monto_pago  | 
| frecuencia_pago | enum('quincenal','mensual') | |
| mensualidades | integer | mensual 2-18 |
| monto_pago | numeric(15,2) | Monto por cada pago |
| dia_pago | integer | Día acordado para pagar |
| fecha_primer_pago | date | |
| **— Administrativo —** | | |
| vendedor | text | Nombre del vendedor que realizó la venta |
| factura | boolean DEFAULT false | Si el cliente requiere factura |
| comision | boolean DEFAULT false | Si aplica comisión por la venta |
| estado | enum('inicio','activo','pausa','liquidado') | |
| notas | text | Observaciones internas |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Lógica del saldo y total_pagado:**
- Al crear el cliente: `saldo = precio_venta - descuento`, `total_pagado = 0`
- Al registrar un pago: `saldo = saldo - monto_pagado`, `total_pagado = total_pagado + monto_pagado`

**Lógica del número de contrato:**
```sql
-- Función para generar número de contrato autogenerado
CREATE OR REPLACE FUNCTION generar_numero_contrato()
RETURNS TEXT AS $$
DECLARE
  año TEXT;
  consecutivo INTEGER;
  nuevo_numero TEXT;
BEGIN
  año := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO consecutivo
  FROM clientes
  WHERE numero_contrato LIKE 'CLI-' || año || '-%';
  nuevo_numero := 'CLI-' || año || '-' || LPAD(consecutivo::TEXT, 4, '0');
  RETURN nuevo_numero;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar automáticamente al insertar
CREATE OR REPLACE FUNCTION trigger_numero_contrato()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_contrato IS NULL OR NEW.numero_contrato = '' THEN
    NEW.numero_contrato := generar_numero_contrato();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_numero_contrato
  BEFORE INSERT ON clientes
  FOR EACH ROW EXECUTE FUNCTION trigger_numero_contrato();
```
**Nota:** para crear el calendario de pagos tener en cuenta la frecuencia de pago si es quincenal
  se duplican los pagos programados y se pregunta por el dia de la segunda quincena
  las condiciones de pago pueden cambiar asi que deben ser editables y el calendario de pago actualizarse

### `pagos`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| cliente_id | uuid (FK → clientes) | |
| gestor_id | uuid (FK → gestores) | Gestor que cobró este pago específico |
| numero_pago | integer | Número de pago en el calendario |
| fecha_programada | date | Fecha en que debía pagarse |
| fecha_pago | date | Fecha real del pago |
| monto_programado | numeric(15,2) | |
| monto_pagado | numeric(15,2) DEFAULT 0 | |
| dias_atraso | integer DEFAULT 0 | |
| estado | enum('pendiente','pagado','vencido') | |
| notas | text | |
| created_at | timestamptz | |

**Nota:** El `gestor_id` en pagos registra quién cobró ese pago específico precargar el gestor asignado actualmente
Si el cliente cambia de gestor, los pagos anteriores mantienen el gestor original.

### `seguimientos`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| cliente_id | uuid (FK → clientes) | |
| usuario_id | uuid (FK → usuarios) | Usuario que registró el seguimiento |
| tipo_contacto | enum('llamada','whatsapp','email') | |
| resultado | enum('contactado','no_contesto','promesa_pago','numero_incorrecto') | |
| fecha_contacto | timestamptz DEFAULT NOW() | |
| notas | text | |
| created_at | timestamptz | |

---

## Módulos y funcionalidades

### 1. Autenticación y roles
- Login con email/password usando Supabase Auth
- Tres roles: **Socio**, **Admin**, **Supervisor**
- Rutas protegidas por rol con React Router
- Sesión persistente con refresh token

### 2. Dashboard
- KPIs: cartera total, cobrado, saldo pendiente, cartera vencida, total clientes del del mes actual
- Gráfica de cobranza por gesores mes actual (BarChart — Recharts)
- Gráfica de distribución por estado de cliente mes actual (PieChart)
- Top 10 pagos más urgentes (más días de atraso)
- Rendimiento por gestor mes actual (barra de progreso)

### 3. Módulo de Clientes
- Listado con TanStack Table: búsqueda global, filtros por estado y gestor, paginación
- Formulario de alta/edición con todos los campos
- El `numero_contrato` se genera automáticamente via trigger en PostgreSQL — no se muestra en el formulario
- Cálculo automático: `saldo = precio_venta - descuento` al crear
- Generación automática del calendario de pagos según frecuencia al crear cliente
- Ficha detalle con tabs:
  - **Información** — datos personales, contrato y administrativos (vendedor, factura, comisión)
  - **Pagos** — calendario completo con estados y botón registrar pago, boton editar pago con aviso
  - **Seguimientos** — historial de contactos
- Cambio de gestor — actualiza `gestor_id` en clientes, los pagos pasados conservan su gestor
- Aplicar descuento — actualiza `saldo` y  `meses_pagados`
- Estados: inicio → activo → pausa → liquidado

### 4. Módulo de Gestores (solo Socio y Admin)
- CRUD completo de gestores
- Ver clientes asignados por gestor
- Reasignación de clientes entre gestores

### 5. Módulo de Cobranza
- Cartera vencida con semáforo visual (verde/naranja/rojo)
- Registro de pagos — actualiza `saldo` y `total_pagado` del cliente automáticamente
- Registro de seguimientos
- Filtros por gestor y estado
-cargar solo clientes activos

### 6. Reportes (exportación a Excel con xlsx)

#### Reporte 1: Cobranza detallada
-solo clientes que pagaron
- Filtros: rango de fechas y gestor
- Columnas: número contrato, cliente, gestor, fecha pago, monto pagado, número de pago, si requiere factura
-ordenar por fecha pago acendente

#### Reporte 2: Pagos a cobrar por período
-filtar por defaul solo clientes activos(estado)
- Filtros: rango de fecha programada, gestor  
- Columnas: cliente, gestor, fecha programada, fecha pago, monto pagado, días de atraso
-ordenar por fecha programada

#### Reporte 3: Cartera vencida
- Filtros: fecha de corte y gestor
- Columnas: número contrato, cliente, gestor, saldo total, total pagado, pagos vencidos, días de atraso, teléfono

---

## Lógica de negocio crítica

### Generación del calendario de pagos
```typescript
// Al crear un cliente, generar todos los pagos automáticamente
const generarPagos = (cliente: Cliente) => {
  const pagos = [];
  let fecha = new Date(cliente.fecha_primer_pago);

  for (let i = 1; i <= cliente.numero_pagos; i++) {
    pagos.push({
      cliente_id: cliente.id,
      gestor_id: cliente.gestor_id,
      numero_pago: i,
      fecha_programada: fecha.toISOString().split('T')[0],
      monto_programado: cliente.monto_pago,
      estado: 'pendiente',
    });

    // Avanzar según frecuencia
    if (cliente.frecuencia_pago === 'quincenal') {
      fecha.setDate(fecha.getDate() + 15);
    } else {
      fecha.setMonth(fecha.getMonth() + 1);
    }
  }
  return pagos;
};
```

### Registrar un pago
```typescript
// 1. Actualizar el pago
await supabase.from('pagos').update({
  monto_pagado,
  fecha_pago: new Date().toISOString().split('T')[0],
  estado: 'pagado',
  gestor_id, // gestor que cobró
  registrado_por: usuario.id,
}).eq('id', pago_id);

// 2. Actualizar saldo y total_pagado del cliente
await supabase.from('clientes').update({
  saldo: cliente.saldo - monto_pagado,
  total_pagado: cliente.total_pagado + monto_pagado,
  estado: (cliente.saldo - monto_pagado) <= 0 ? 'liquidado' : cliente.estado,
}).eq('id', cliente_id);
```

---

## Políticas de seguridad RLS

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden verse a sí mismos
CREATE POLICY "usuarios_ver_propio" ON usuarios
  FOR SELECT USING (auth.uid() = id);

-- Socio y Admin ven todos los usuarios
CREATE POLICY "admin_ver_usuarios" ON usuarios
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('socio', 'admin'))
  );

-- Socio: acceso total a clientes
CREATE POLICY "socio_clientes" ON clientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'socio')
  );

-- Admin: acceso total a clientes
CREATE POLICY "admin_clientes" ON clientes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin')
  );

-- Supervisor: solo lectura en clientes
CREATE POLICY "supervisor_lectura_clientes" ON clientes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'supervisor')
  );

-- Supervisor: acceso total a seguimientos
CREATE POLICY "supervisor_seguimientos" ON seguimientos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid())
  );

-- Socio y Admin: acceso total a pagos
CREATE POLICY "admin_pagos" ON pagos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('socio', 'admin'))
  );

-- Supervisor: solo lectura en pagos
CREATE POLICY "supervisor_lectura_pagos" ON pagos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'supervisor')
  );

-- Todos los usuarios autenticados pueden ver gestores
CREATE POLICY "ver_gestores" ON gestores
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo Socio y Admin pueden crear/editar gestores
CREATE POLICY "admin_gestores" ON gestores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('socio', 'admin'))
  );
```

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

---

## Convenciones de código

- Componentes: PascalCase
- Hooks personalizados: `use` + PascalCase
- **CRÍTICO:** Siempre usar `useMemo` en columnas y datos filtrados de TanStack Table para evitar loops infinitos de renders
- **CRÍTICO:** Siempre usar `useCallback` en funciones que se pasan como props a componentes hijos
- **CRÍTICO:** Usar `useRef` para controlar que los `useEffect` solo se ejecuten una vez al montar
- **CRÍTICO:** No llamar hooks de datos dentro de componentes que reciben los datos como props — pasar los datos desde la página padre
- Todos los textos de la UI en **español (México)**
- Formato de moneda: `$X,XXX.XX MXN`
- Formato de fechas: `DD/MM/YYYY`

---

## Orden de implementación sugerido

1. Ejecutar el SQL del trigger de `numero_contrato` en Supabase
2. Autenticación y rutas protegidas por rol
3. Módulo de Gestores (base para asignar clientes)
4. Módulo de Clientes con calendario de pagos automático
5. Módulo de Cobranza con registro de pagos
6. Dashboard con métricas y gráficas
7. Reportes Excel
