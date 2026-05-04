# Prompt: Sistema Formex - Versión Desktop
## Aplicación de Gestión de Cobranza para Windows

---

## 📋 CONTEXTO Y DESCRIPCIÓN

Eres un desarrollador full-stack senior especializado en aplicaciones de gestión empresarial.

**Misión:** Crear una **aplicación de escritorio** (desktop app) para Windows que replique completamente la funcionalidad del **Sistema Formex** actual, que es una aplicación web de cobranza para cursos de informática a crédito.

**Tipo de negocio:** 
- Venta de cursos de informática **a crédito**
- Clientes pagan en **frecuencia semanal, quincenal o mensual**
- Contratos hasta **18 meses** de duración
- **Single-tenant** — una sola empresa por instalación
- Necesidad de gestionar: clientes, cobros, seguimientos, gestores, comisiones y reportes

**Restricciones:**
- ✅ Funciona **offline** (sin conexión a internet)
- ✅ Base de datos **local** en PostgreSQL
- ✅ API local en Node.js/Express (mismo servidor)
- ✅ **Windows 10+** como SO objetivo
- ✅ Interfaz similar a la web (reutilizar UI/UX)
- ✅ Roles de usuario: **Socio, Admin, Supervisor**

---

## 🏗️ STACK TECNOLÓGICO

### Frontend (Aplicación Tauri)
```
Framework: Tauri v1 o v2 (Rust backend, React frontend)
Frontend UI: React 18 + TypeScript + Vite
Estilos: Tailwind CSS + shadcn/ui (reutilizar componentes existentes)
Formularios: React Hook Form + Zod
Tablas: TanStack Table v8
Gráficas: Recharts
Exportación: xlsx, jsPDF (reportes + PDF)
Estado: Zustand
Notificaciones: react-hot-toast
Enrutamiento: React Router v6
```

### Backend API (Node.js/Express)
```
Runtime: Node.js 18+
Framework: Express.js
Base de datos: PostgreSQL 13+ (local)
ORM: Knex.js o TypeORM (para simplificar migraciones)
Autenticación: JWT (token-based, sin OAuth)
Validación: Joi o Zod
CORS: Habilitado para Tauri
Logs: Winston o pino
```

### Base de Datos
```
PostgreSQL 13+ (instalado localmente en Windows)
Conexión: localhost:5432
Base de datos: formex_db
Usuario: formex_user
Puerto estándar: 5432
```

### Infraestructura (Windows)
```
Tauri App: Empaquetado como .msi (Windows installer)
Express Server: Ejecutado como proceso hijo de Tauri (no requiere instalación manual)
PostgreSQL: Instalación independiente en Windows (primer paso del setup)
Puerto API: 3001 (por defecto, configurable)
Puerto Base de datos: 5432
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
formex-desktop/
├── src-tauri/                    # Backend Rust de Tauri + Express + Node
│   ├── src/
│   │   └── main.rs              # Punto de entrada, lanzar Express como child process
│   ├── Cargo.toml               # Dependencias Rust
│   └── tauri.conf.json          # Configuración de Tauri
│
├── src/                          # Frontend React/Vite (idéntico al actual)
│   ├── components/               # Reutilizar componentes existentes
│   │   ├── ui/                  # Componentes base shadcn/ui
│   │   ├── layout/              # Sidebar, Topbar
│   │   ├── clientes/            # Módulo clientes
│   │   ├── cobranza/            # Módulo cobranza
│   │   ├── gestores/            # Módulo gestores
│   │   ├── comisiones/          # Módulo comisiones
│   │   ├── dashboard/           # Dashboard
│   │   └── shared/              # Componentes compartidos
│   ├── pages/                    # Páginas principales (reutilizar)
│   ├── hooks/                    # Custom hooks (adaptar para API local)
│   ├── store/                    # Zustand stores
│   ├── lib/                      # Librerías
│   │   ├── api.ts               # Cliente HTTP para Express (reemplaza Supabase)
│   │   ├── auth.ts              # Autenticación local con JWT
│   │   └── db.ts                # (Opcional) Cliente directo a PostgreSQL
│   ├── types/                    # Tipos TypeScript (reutilizar)
│   ├── utils/                    # Utilidades (reutilizar)
│   ├── validations/              # Schemas Zod (reutilizar)
│   ├── App.tsx                  # Punto de entrada React
│   ├── main.tsx                 # main.tsx
│   └── index.css                # Estilos globales
│
├── server/                       # Código Node.js/Express
│   ├── src/
│   │   ├── index.ts             # Punto de entrada Express
│   │   ├── db/
│   │   │   ├── pool.ts          # Pool de conexiones PostgreSQL
│   │   │   ├── migrations/      # Migraciones SQL (de Supabase adaptadas)
│   │   │   └── seeds/           # Datos iniciales (usuarios demo, gestores, etc)
│   │   ├── routes/
│   │   │   ├── auth.ts          # Login, logout, verify token
│   │   │   ├── clientes.ts      # CRUD clientes
│   │   │   ├── pagos.ts         # Registrar pagos, reversiones
│   │   │   ├── calendarios.ts   # Generar calendarios, consultar
│   │   │   ├── gestores.ts      # CRUD gestores
│   │   │   ├── seguimientos.ts  # CRUD seguimientos
│   │   │   ├── usuarios.ts      # CRUD usuarios (solo Socio)
│   │   │   ├── comisiones.ts    # Cálculos y reportes comisiones
│   │   │   ├── reportes.ts      # Reportes, cartera vencida, métricas
│   │   │   └── estadisticas.ts  # Dashboard, gráficas
│   │   ├── controllers/         # Lógica de negocio
│   │   │   ├── clienteController.ts
│   │   │   ├── pagoController.ts
│   │   │   ├── seguimientoController.ts
│   │   │   └── ...
│   │   ├── services/            # Servicios (lógica reutilizable)
│   │   │   ├── pagoService.ts   # Registrar pago, actualizar calendarios
│   │   │   ├── calendarioService.ts # Generar calendarios
│   │   │   ├── comisionService.ts # Cálculos de comisión
│   │   │   ├── reporteService.ts # Lógica de reportes
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Verificar JWT
│   │   │   ├── roles.ts         # Verificar permisos (Socio/Admin/Supervisor)
│   │   │   └── errorHandler.ts  # Manejo centralizado de errores
│   │   ├── utils/
│   │   │   ├── validators.ts    # Validación de datos (Zod/Joi)
│   │   │   ├── formatters.ts    # Formateo de fechas, moneda
│   │   │   ├── dateHelpers.ts   # Helpers de fechas
│   │   │   ├── businessLogic.ts # Lógica de calendarios y pagos (reutilizar de frontend)
│   │   │   └── logger.ts        # Winston/pino logger
│   │   └── types/
│   │       └── index.ts         # Tipos TypeScript compartidos
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                 # Scripts para dev/build
├── vite.config.ts               # Configuración Vite
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── .env.example                 # Variables de entorno
```

---

## 🗄️ ESQUEMA DE BASE DE DATOS (PostgreSQL)

**Nota:** Idéntico al esquema actual de Supabase, pero sin RLS (Row Level Security).
En su lugar, usar autenticación JWT en el backend.

### Tablas principales:

```sql
-- ENUMS
CREATE TYPE usuario_rol AS ENUM ('socio', 'admin', 'supervisor');
CREATE TYPE cliente_estado AS ENUM ('inicio', 'activo', 'pausa', 'liquidado');
CREATE TYPE pago_frecuencia AS ENUM ('quincenal', 'mensual');
CREATE TYPE contacto_tipo AS ENUM ('llamada', 'whatsapp', 'email');
CREATE TYPE contacto_resultado AS ENUM ('contactado', 'no_contesto', 'promesa_pago', 'numero_incorrecto');

-- USUARIOS
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol usuario_rol NOT NULL DEFAULT 'admin',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GESTORES
CREATE TABLE gestores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENTES
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato TEXT UNIQUE,
  gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL,
  nombre_completo TEXT NOT NULL,
  telefono_celular TEXT,
  email TEXT,
  ubicacion TEXT,
  empresa TEXT,
  telefono_empresa TEXT,
  ref_nombre TEXT,
  ref_telefono TEXT,
  fecha_inicio DATE,
  precio_venta NUMERIC(15,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(15,2) DEFAULT 0,
  total_pagado NUMERIC(15,2) DEFAULT 0,
  saldo NUMERIC(15,2) GENERATED ALWAYS AS (precio_venta - descuento - total_pagado) STORED,
  meses_pagados INT GENERATED ALWAYS AS (CASE WHEN monto_pago > 0 THEN (total_pagado / monto_pago)::INT ELSE 0 END) STORED,
  frecuencia_pago pago_frecuencia NOT NULL DEFAULT 'mensual',
  mensualidades INT CHECK (mensualidades >= 2 AND mensualidades <= 18),
  numero_pagos INT,
  monto_pago NUMERIC(15,2) DEFAULT 0,
  dia_pago INT CHECK (dia_pago >= 1 AND dia_pago <= 31),
  fecha_primer_pago DATE,
  vendedor TEXT,
  factura BOOLEAN DEFAULT false,
  comision BOOLEAN DEFAULT false,
  estado cliente_estado NOT NULL DEFAULT 'inicio',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CALENDARIOS DE PAGOS
CREATE TABLE calendarios_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_cuota INT NOT NULL,
  fecha_programada DATE NOT NULL,
  monto_programado NUMERIC(15,2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  saldo_pendiente NUMERIC(15,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cliente_id, numero_cuota)
);

-- PAGOS REALIZADOS
CREATE TABLE pagos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL,
  fecha_pago DATE NOT NULL,
  monto_pagado NUMERIC(15,2) NOT NULL,
  notas TEXT,
  motivo_eliminacion TEXT,
  fecha_eliminacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SEGUIMIENTOS
CREATE TABLE seguimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo_contacto contacto_tipo NOT NULL,
  resultado contacto_resultado NOT NULL,
  fecha_contacto TIMESTAMPTZ DEFAULT now(),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COMISIONES
CREATE TABLE comisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL,
  porcentaje NUMERIC(5,2),
  monto_base NUMERIC(15,2),
  monto_comision NUMERIC(15,2),
  estado VARCHAR(50) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_gestor_id ON clientes(gestor_id);
CREATE INDEX idx_clientes_numero_contrato ON clientes(numero_contrato);
CREATE INDEX idx_calendarios_cliente_id ON calendarios_pagos(cliente_id);
CREATE INDEX idx_calendarios_estado ON calendarios_pagos(estado);
CREATE INDEX idx_pagos_cliente_id ON pagos_realizados(cliente_id);
CREATE INDEX idx_pagos_gestor_id ON pagos_realizados(gestor_id);
CREATE INDEX idx_seguimientos_cliente_id ON seguimientos(cliente_id);
CREATE INDEX idx_seguimientos_usuario_id ON seguimientos(usuario_id);
CREATE INDEX idx_comisiones_cliente_id ON comisiones(cliente_id);
CREATE INDEX idx_comisiones_gestor_id ON comisiones(gestor_id);
```

---

## 🔐 AUTENTICACIÓN Y ROLES

### Sistema de Autenticación

**Método:** JWT (JSON Web Tokens)
- **No usar OAuth** — solo email/password local
- Token almacenado en localStorage (React)
- Refresh token en httpOnly cookie (opcional para mayor seguridad)

**Flujo de login:**

```
1. Usuario ingresa email + password en LoginPage
2. Frontend envía POST /api/auth/login al backend
3. Backend valida credenciales contra tabla usuarios
4. Si es correcto, genera JWT (con rol en payload)
5. Backend retorna { token, usuario }
6. Frontend almacena token y redirige a /dashboard
7. Todos los requests posteriores incluyen token en header: Authorization: Bearer <token>
```

### Roles y Permisos

| Rol | Clientes | Pagos | Usuarios | Reportes | Comisiones | Seguimientos |
|-----|----------|-------|----------|----------|------------|--------------|
| **Socio** | CRUD | CRUD | CRUD | Lectura | CRUD | Lectura |
| **Admin** | CRUD | CRUD | Lectura | Lectura | Lectura | Lectura |
| **Supervisor** | Lectura | Lectura | ✗ | ✗ | ✗ | CRUD |

**Implementación en backend:**
```typescript
// Middleware de protección
app.get('/api/clientes', authMiddleware, roleMiddleware(['socio', 'admin']), getClientes);

// En el middleware roleMiddleware:
// Validar que req.user.rol esté en la lista de roles permitidos
```

---

## 📦 MÓDULOS Y CARACTERÍSTICAS

### 1. **Dashboard**
- ✅ Resumen de cobros del mes
- ✅ Gráfica de ingresos (Recharts)
- ✅ Total de clientes por estado
- ✅ Cartera vencida (alertas)
- ✅ Últimos pagos registrados
- ✅ Métricas de comisiones (si aplica)

**Endpoint:** `GET /api/estadisticas/dashboard`

### 2. **Módulo Clientes**
**CRUD completo:**
- ✅ Listar clientes (con filtros: estado, gestor, búsqueda por nombre)
- ✅ Ver detalle de cliente
- ✅ Crear cliente (auto-genera número de contrato)
- ✅ Editar cliente
- ✅ Eliminar cliente (soft delete marcando como inactivo)
- ✅ Importar clientes desde Excel

**Lógica especial:**
- Al crear cliente → auto-generar número de contrato (CLI-2025-0001)
- Al crear cliente → generar calendario de pagos automáticamente
- Cambiar de estado: inicio → activo → pausa → liquidado
- Reasignar a otro gestor (cambio de gestor)

**Endpoints:**
```
GET    /api/clientes              # Listar
POST   /api/clientes              # Crear
GET    /api/clientes/:id          # Detalle
PUT    /api/clientes/:id          # Editar
DELETE /api/clientes/:id          # Eliminar (soft)
POST   /api/clientes/importar     # Importar Excel
```

### 3. **Módulo Cobranza**
**Registrar pagos:**
- ✅ Registrar nuevo pago (cualquier monto)
- ✅ Ver calendario de pagos pendientes
- ✅ Ver historial de pagos realizados
- ✅ Reversión de pagos (con motivo)
- ✅ Cartera vencida (clientes con pagos atrasados)
- ✅ Alertas visuales de atraso

**Lógica de negocio:**
- Pago flexible: el usuario puede pagar cualquier monto (no solo el exacto)
- Al registrar pago:
  - Actualizar `total_pagado` del cliente
  - Actualizar `saldo` (calculado automáticamente)
  - Marcar cuotas pagadas en calendario_pagos
  - Si saldo ≤ 0 → marcar cliente como "liquidado"
- Reversión: cambiar estado del pago, registrar motivo
- Mostrar fecha de vencimiento de cuota vs. fecha actual para calcular atraso

**Endpoints:**
```
GET    /api/calendarios/:clienteId     # Ver calendario
POST   /api/pagos-realizados           # Registrar pago
GET    /api/pagos-realizados/:clienteId # Historial pagos
DELETE /api/pagos-realizados/:id       # Reversar pago
GET    /api/reportes/cartera-vencida   # Cartera vencida
```

### 4. **Módulo Gestores**
**CRUD gestores:**
- ✅ Listar gestores
- ✅ Crear gestor
- ✅ Editar gestor
- ✅ Activar/desactivar gestor
- ✅ Ver clientes asignados a cada gestor
- ✅ Ver comisiones de cada gestor

**Endpoints:**
```
GET    /api/gestores          # Listar
POST   /api/gestores          # Crear
GET    /api/gestores/:id      # Detalle
PUT    /api/gestores/:id      # Editar
GET    /api/gestores/:id/comisiones  # Comisiones del gestor
```

### 5. **Módulo Comisiones**
**Cálculo automático de comisiones:**
- Comisión = porcentaje sobre monto pagado (configurable por cliente)
- Mostrar: comisión pendiente, pagada, total
- Reportes de comisiones por gestor, por período
- Exportar listado de comisiones

**Endpoints:**
```
GET    /api/comisiones                 # Listar comisiones
GET    /api/comisiones/gestor/:id      # Comisiones por gestor
GET    /api/comisiones/reportes        # Reportes
POST   /api/comisiones/calcular        # Calcular (bulk)
```

### 6. **Módulo Seguimientos**
**Registrar contactos:**
- ✅ Registrar seguimiento (llamada, WhatsApp, email)
- ✅ Resultado: contactado, no contestó, promesa de pago, número incorrecto
- ✅ Ver historial de seguimientos por cliente
- ✅ Búsqueda por fecha, resultado

**Endpoints:**
```
POST   /api/seguimientos           # Registrar
GET    /api/seguimientos/:clienteId # Historial por cliente
GET    /api/seguimientos           # Listar (con filtros)
```

### 7. **Módulo Reportes**
**Reportes disponibles:**
- ✅ Cobranza diaria/semanal/mensual
- ✅ Cartera vencida (clientes con atraso)
- ✅ Resumen de clientes por estado
- ✅ Comisiones por gestor
- ✅ Rendimiento de gestores (clientes captados, monto cobrado)
- ✅ Análisis de seguimientos
- ✅ Exportar a Excel/PDF

**Endpoints:**
```
GET    /api/reportes/cobranza          # Cobranza
GET    /api/reportes/cartera-vencida   # Cartera vencida
GET    /api/reportes/comisiones        # Comisiones
GET    /api/reportes/gestores          # Rendimiento gestores
GET    /api/reportes/seguimientos      # Análisis seguimientos
GET    /api/reportes/exportar-excel    # Descargar Excel
```

### 8. **Módulo de Usuarios** (Solo Socio)
**Gestión de usuarios:**
- ✅ Listar usuarios
- ✅ Crear usuario (asignar rol)
- ✅ Editar rol de usuario
- ✅ Desactivar usuario
- ✅ Cambiar contraseña

**Endpoints:**
```
GET    /api/usuarios          # Listar (solo Socio)
POST   /api/usuarios          # Crear (solo Socio)
PUT    /api/usuarios/:id      # Editar (solo Socio)
DELETE /api/usuarios/:id      # Desactivar (solo Socio)
```

---

## 🎨 COMPONENTES REUTILIZABLES

Reutilizar **100%** de los componentes React actuales:

### Componentes de UI (shadcn/ui)
- ✅ Button, Input, Select, Table, Modal, Toast, etc.

### Componentes de Layout
- ✅ Sidebar con navegación
- ✅ Topbar con usuario + logout
- ✅ Page header
- ✅ Loading spinner

### Componentes por módulo
**Clientes:**
- ClientesTable (TanStack Table)
- ClienteForm (React Hook Form + Zod)
- ClienteDetail
- ModalImportarClientes
- ModalEditarFechaPago

**Cobranza:**
- CalendarioPagos
- ModalRegistrarPago
- ModalRegistrarPagoRealizado
- ModalMotiveReversal
- PagosTable
- ResumenCobranza
- CarteraVencida

**Gestores:**
- GestoresTable
- GestorForm

**Dashboard:**
- ResumenCards
- GraficaIngresos (Recharts)
- ÚltimosPagos
- AlertasCartera

---

## 📋 VALIDACIONES Y REGLAS DE NEGOCIO

### Validación de Cliente
```typescript
const clienteSchema = z.object({
  nombre_completo: z.string().min(3).max(100),
  numero_contrato: z.string().optional(),
  telefono_celular: z.string().regex(/^\d{10}$/),
  email: z.string().email(),
  precio_venta: z.number().positive(),
  descuento: z.number().nonnegative(),
  mensualidades: z.number().min(2).max(18),
  dia_pago: z.number().min(1).max(31),
  frecuencia_pago: z.enum(['quincenal', 'mensual']),
  // ... más campos
});
```

### Cálculos Automáticos
```typescript
// Al crear cliente:
numero_pagos = frecuencia_pago === 'quincenal' ? mensualidades * 2 : mensualidades
monto_pago = (precio_venta - descuento) / numero_pagos
saldo = precio_venta - descuento

// Al registrar pago:
total_pagado += monto_pagado
saldo = precio_venta - descuento - total_pagado
meses_pagados = Math.floor(total_pagado / monto_pago)
if (saldo <= 0) estado = 'liquidado'

// Comisión:
monto_comision = monto_pagado * (porcentaje / 100)
```

### Reglas de Negocio
1. No permitir crear cliente sin todos los datos requeridos
2. No permitir descuento mayor al precio de venta
3. No permitir eliminar gestor si tiene clientes activos
4. No permitir reversión de pago si fue de hace más de 30 días (configurable)
5. Validar unicidad de número de contrato
6. Generar automáticamente número de contrato al crear cliente

---

## 🚀 SETUP Y DEPLOYMENT

### Instalación en Windows (Usuario final)

**Paso 1: Prerequisitos**
- Windows 10 o superior
- PostgreSQL 13+ instalado (descargar desde postgresql.org)
- Usuario y contraseña de PostgreSQL configurados

**Paso 2: Instalación de app**
- Descargar Formex_Setup.msi
- Ejecutar instalador
- Seleccionar directorio de instalación

**Paso 3: Configuración inicial**
- La app detecta si PostgreSQL está instalado
- Si no está, mostrar instrucción de instalación
- Crear base de datos "formex_db" automáticamente (si no existe)
- Ejecutar migraciones
- Insertar datos de ejemplo (usuarios demo, gestores)

**Paso 4: Primera sesión**
- App se abre en localhost
- Usuario por defecto: socio@formex.local / password123
- Desde la app, crear más usuarios

### Variables de Entorno

**.env.local (Frontend React en Tauri)**
```env
VITE_API_URL=http://localhost:3001
VITE_API_TIMEOUT=5000
```

**server/.env (Backend Express)**
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=formex_db
DB_USER=formex_user
DB_PASSWORD=secure_password_here
JWT_SECRET=super_secret_key_here
JWT_EXPIRY=24h
LOG_LEVEL=info
```

### Build y Empaquetamiento

```bash
# Frontend + Tauri
npm run build:tauri    # Crea Formex_Setup.msi para Windows

# Backend separado (en carpeta server/)
cd server && npm run build
```

**Salida:**
- `Formex_Setup.msi` — Instalador para Windows
- `formex-v1.0.0.exe` — Ejecutable portable (opcional)

---

## 🔧 DIFERENCIAS CLAVE CON VERSIÓN WEB

| Aspecto | Web (Supabase) | Desktop (Tauri + PostgreSQL) |
|--------|---|---|
| **Base de datos** | Supabase (cloud) | PostgreSQL local |
| **Autenticación** | Supabase Auth | JWT local |
| **API** | Supabase JS client | Express REST API |
| **Hosting** | Cloud (URL) | Localhost |
| **Offline** | No | Sí (funciona sin internet) |
| **RLS** | Sí (Supabase) | No, usa JWT en backend |
| **Instalación** | Deploy web | MSI installer Windows |
| **Performance** | Depende conexión | Muy rápido (local) |
| **Datos** | Cloud (backup automático) | Local (requiere backup manual) |
| **Escalabilidad** | Multi-tenant posible | Single-tenant |

---

## 📝 CONSIDERACIONES IMPORTANTES

### 1. **Proceso hijo de Tauri**
- El backend Express DEBE ejecutarse como child process desde Tauri
- Tauri espera a que Express esté listo (healthcheck en puerto 3001)
- Si Express falla, mostrar error al usuario
- Al cerrar app, terminar proceso Express

### 2. **Migraciones de BD**
- Guardar todas las migraciones SQL en `server/db/migrations/`
- Ejecutarlas automáticamente en primer inicio
- Usar Knex.js para manejar versionado de migraciones

### 3. **Backup y Datos**
- Crear script de backup de PostgreSQL (`.sql` file)
- Opción en settings para backup manual
- Restaurar desde backup (archivo seleccionado)

### 4. **Performance**
- Queries de clientes con + de 100 registros → paginación
- Índices en campos de búsqueda frecuentes
- Caché en frontend (Zustand) para evitar requests innecesarios

### 5. **Seguridad**
- Contraseñas hasheadas en BD (bcrypt)
- JWT con expiración
- CORS restringido a localhost:5173
- Sanitizar inputs (prevenir SQL injection)
- No logear contraseñas

### 6. **Exportación**
- Excel: usar `xlsx` library (reutilizar)
- PDF: usar `jsPDF` + `html2canvas` (reutilizar)
- Dar opción de exportar con/sin datos sensibles

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup Base
- [ ] Crear proyecto Tauri
- [ ] Configurar Vite + React + TypeScript
- [ ] Setup carpeta `server/` con Express
- [ ] Crear esquema PostgreSQL (migraciones)
- [ ] Setup autenticación JWT en backend

### Fase 2: API Backend
- [ ] Rutas de autenticación (login, verify token)
- [ ] CRUD Clientes (rutas + lógica)
- [ ] CRUD Gestores
- [ ] CRUD Pagos realizados (registrar, reversión)
- [ ] CRUD Seguimientos
- [ ] Cálculos de calendarios de pagos
- [ ] Cálculos de comisiones

### Fase 3: Frontend Tauri
- [ ] Migrar componentes React existentes
- [ ] Adaptar hooks para consumir API local (reemplazar Supabase)
- [ ] Setup Zustand stores
- [ ] Página de login
- [ ] Dashboard
- [ ] Módulo clientes (completo)
- [ ] Módulo cobranza (completo)
- [ ] Módulo gestores
- [ ] Módulo reportes

### Fase 4: Reportes y Exportación
- [ ] Endpoints de reportes (backend)
- [ ] Componentes de reportes (frontend)
- [ ] Exportación a Excel
- [ ] Generación de PDF

### Fase 5: Setup Automático
- [ ] Script de instalación para PostgreSQL
- [ ] Setup automático de BD (migraciones)
- [ ] Usuarios de demostración
- [ ] Configuración de rutas y carpetas

### Fase 6: Build y Empaquetamiento
- [ ] Build de Tauri
- [ ] Crear MSI installer
- [ ] Tester en VM Windows limpia
- [ ] Documentación de instalación

### Fase 7: Ajustes Finales
- [ ] Testing completo
- [ ] Optimización de performance
- [ ] Documentación de usuario
- [ ] Build final de release

---

## 📚 REFERENCIAS Y RECURSOS

- [Tauri Docs](https://tauri.app/v1/guides/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [TanStack Table](https://tanstack.com/table/v8/)
- [Recharts](https://recharts.org/)

---

## 🎯 OBJETIVO FINAL

Crear una **aplicación de escritorio profesional, rápida y segura** que funcione offline en Windows, con todas las funcionalidades de la versión web actual, manteniendo la misma experiencia de usuario y añadiendo las ventajas de una aplicación de escritorio (performance, offline, instalador nativo).

**Versión:** v1.0.0
**Target:** Windows 10+
**Licencia:** Privada

---
