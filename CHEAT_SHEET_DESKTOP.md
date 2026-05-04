# Cheat Sheet: Referencia rápida de decisiones y arquitectura

## 🏗️ Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO FINAL                          │
│                    (Windows 10+ User)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Abre Formex.exe
                         ▼
        ┌────────────────────────────────────┐
        │      TAURI MAIN WINDOW             │
        │   ┌──────────────────────────┐     │
        │   │  React App (Vite)        │     │ ← Port 5173
        │   │  • Componentes React     │     │   (Internal)
        │   │  • Zustand stores        │     │
        │   │  • UI (Tailwind CSS)     │     │
        │   │  • Navegación            │     │
        │   └─────────┬────────────────┘     │
        │             │                      │
        │        HTTP Calls                  │
        │        Axios Client                │
        │             │                      │
        │   ┌─────────▼────────────────┐     │
        │   │  Tauri Backend (Rust)    │     │
        │   │  • IPC bridges           │     │
        │   │  • File system access    │     │
        │   └─────────┬────────────────┘     │
        │             │                      │
        └─────────────┼──────────────────────┘
                      │
                      │ (Same Process)
        ┌─────────────▼──────────────────────┐
        │      EXPRESS SERVER                 │
        │   (Child process of Tauri)          │ ← Port 3001
        │                                     │
        │  ┌──────────────────────────────┐   │
        │  │  Express.js API              │   │
        │  │  • Routes                    │   │
        │  │  • Controllers               │   │
        │  │  • Services                  │   │
        │  │  • Middleware (JWT, Roles)   │   │
        │  │  • Error handling            │   │
        │  └──────────┬───────────────────┘   │
        │             │                       │
        │        SQL Queries                  │
        │        node-postgres                │
        │             │                       │
        │  ┌──────────▼───────────────────┐   │
        │  │  PostgreSQL Connection Pool  │   │
        │  │  • Connection management    │   │
        │  │  • Query execution         │   │
        │  │  • Error handling          │   │
        │  └──────────┬──────────────────┘   │
        │             │                      │
        └─────────────┼──────────────────────┘
                      │
        ┌─────────────▼──────────────────────┐
        │      PostgreSQL Database            │ ← Port 5432
        │                                     │
        │  • 8 Tablas                        │
        │  • Índices optimizados             │
        │  • Enums y tipos                   │
        │  • Triggers y funciones            │
        │  • Datos persistentes              │
        └─────────────────────────────────────┘
```

---

## 🔐 Flujo de autenticación

```
Usuario ingresa email + password
           │
           ▼
┌─ POST /api/auth/login ─────────────────────┐
│                                             │
│  Validar email + password                   │
│  └─ Query: SELECT * FROM usuarios           │
│                                             │
│  Verificar password con bcrypt              │
│  └─ bcrypt.compare(input, hash)             │
│                                             │
│  ✅ Contraseña correcta                    │
│  └─ Generar JWT                            │
│     jwt.sign({ id, email, rol }, SECRET)  │
│                                             │
│  Retornar: { token, usuario }              │
└────────────────────┬────────────────────────┘
                     │
          ┌──────────▼──────────────┐
          │  Frontend                │
          │                          │
          │  localStorage.setItem(   │
          │    'token',              │
          │    response.token        │
          │  )                       │
          │                          │
          │  → Redirect a /dashboard │
          └──────────┬───────────────┘
                     │
          Requests posteriores
          ─────────────────────
          Header: Authorization: Bearer <token>
                     │
          ┌──────────▼────────────────────┐
          │  Backend Middleware            │
          │                                │
          │  authMiddleware:               │
          │  1. Validar JWT                │
          │  2. Decodificar payload        │
          │  3. Validar expiración         │
          │  4. Pasar a route handler      │
          │                                │
          │  roleMiddleware:               │
          │  1. Verificar req.user.rol     │
          │  2. Comparar con roles         │
          │     permitidos                 │
          │  3. Permitir o rechazar        │
          └────────────────────────────────┘
```

---

## 🗃️ Stack por módulo

### Frontend React
```
Dependencies (package.json)
├── react 19
├── react-dom 19
├── typescript
├── react-router-dom (navegación)
├── zustand (estado global)
├── react-hook-form (formularios)
├── zod (validaciones)
├── tailwindcss (estilos)
├── @tanstack/react-table (tablas)
├── recharts (gráficas)
├── axios (HTTP client)
├── react-hot-toast (notificaciones)
└── lucide-react (iconos)

DevDependencies
├── vite
├── @vitejs/plugin-react
├── typescript
└── eslint
```

### Backend Express
```
Dependencies (server/package.json)
├── express
├── pg (PostgreSQL client)
├── jsonwebtoken (JWT)
├── bcryptjs (password hashing)
├── cors (CORS middleware)
├── dotenv (env variables)
├── zod (validaciones)
├── winston (logging)
└── axios (http client)

DevDependencies
├── typescript
├── ts-node
├── @types/node
├── @types/express
└── nodemon (dev)
```

### Database
```
PostgreSQL 13+
├── ENUMS
│   ├── usuario_rol
│   ├── cliente_estado
│   ├── pago_frecuencia
│   ├── contacto_tipo
│   └── contacto_resultado
├── Tables (8)
│   ├── usuarios
│   ├── gestores
│   ├── clientes
│   ├── calendarios_pagos
│   ├── pagos_realizados
│   ├── seguimientos
│   ├── comisiones
│   └── (más)
├── Índices
├── Triggers/Funciones
└── Constraints
```

---

## 📊 Decisiones de arquitectura

| Decisión | Opción elegida | Por qué |
|----------|---|---|
| **Framework Desktop** | Tauri | Ligero, seguro, Rust backend |
| **Base de datos** | PostgreSQL local | Potente, confiable, relacional |
| **API Backend** | Express.js | Rápido, fácil de usar, maduro |
| **Autenticación** | JWT | Stateless, seguro, sin servidor externo |
| **Estado Frontend** | Zustand | Liviano, performante, fácil de usar |
| **Formularios** | React Hook Form | Performance, validación con Zod |
| **Estilos** | Tailwind CSS | Utility-first, consistencia, velocidad |
| **Tablas** | TanStack Table | Flexible, virtualization, sorting/filtering |
| **Gráficas** | Recharts | React-native, customizable, ligero |
| **Exportación** | xlsx + jsPDF | Estándar, amplio soporte, confiable |
| **Gestor procesos** | Tauri (child process) | Integrado, sin dependencias externas |

---

## 🔄 Mapeo: Web → Desktop

| Web (Actual) | Desktop (Nuevo) |
|---|---|
| Supabase Auth | JWT + Express |
| Supabase JS Client | HTTP Axios |
| Supabase PostgreSQL | PostgreSQL local |
| Hosting en cloud | Aplicación local |
| RLS (Row Level Security) | Middleware de roles |
| Realtime via Supabase | HTTP polling/WebSockets |
| Autoscaling cloud | Single instance |
| Login vía Supabase | Login local con BD |

---

## 🚀 Endpoints principales (Express API)

```
AUTH
├── POST   /api/auth/login           ← Email + password
├── POST   /api/auth/logout          ← Limpiar sesión
└── GET    /api/auth/verify          ← Verificar token

CLIENTES
├── GET    /api/clientes             ← Listar
├── POST   /api/clientes             ← Crear
├── GET    /api/clientes/:id         ← Detalle
├── PUT    /api/clientes/:id         ← Editar
├── DELETE /api/clientes/:id         ← Eliminar
└── POST   /api/clientes/importar    ← Importar Excel

PAGOS
├── POST   /api/pagos-realizados     ← Registrar pago
├── GET    /api/pagos-realizados/:clienteId
├── DELETE /api/pagos-realizados/:id ← Reversar
└── GET    /api/calendarios/:clienteId

GESTORES
├── GET    /api/gestores
├── POST   /api/gestores
├── PUT    /api/gestores/:id
└── DELETE /api/gestores/:id

USUARIOS (Solo Socio)
├── GET    /api/usuarios
├── POST   /api/usuarios
├── PUT    /api/usuarios/:id
└── DELETE /api/usuarios/:id

REPORTES
├── GET    /api/reportes/cobranza
├── GET    /api/reportes/cartera-vencida
├── GET    /api/reportes/comisiones
└── GET    /api/reportes/gestor-rendimiento

ESTADÍSTICAS
├── GET    /api/estadisticas/dashboard
└── GET    /api/estadisticas/metricas
```

---

## 🔒 Control de acceso (roles)

```
┌─────────────┬────────────┬───────────┬────────────┐
│ Recurso     │ Socio      │ Admin     │ Supervisor │
├─────────────┼────────────┼───────────┼────────────┤
│ Clientes    │ CRUD ✅    │ CRUD ✅   │ Lectura 🔍 │
│ Pagos       │ CRUD ✅    │ CRUD ✅   │ Lectura 🔍 │
│ Usuarios    │ CRUD ✅    │ Lectura 🔍│ ✗ No       │
│ Reportes    │ Lectura 🔍 │ Lectura 🔍│ ✗ No       │
│ Comisiones  │ CRUD ✅    │ Lectura 🔍│ ✗ No       │
│ Seguimientos│ CRUD ✅    │ Lectura 🔍│ CRUD ✅    │
│ Gestores    │ CRUD ✅    │ CRUD ✅   │ Lectura 🔍 │
└─────────────┴────────────┴───────────┴────────────┘

Implementación:
roleMiddleware('socio', 'admin') ← Socio Y Admin
roleMiddleware('socio') ← Solo Socio
roleMiddleware(['socio', 'admin', 'supervisor']) ← Todos
```

---

## 📦 Estructura de datos (TypeScript)

```typescript
// Usuario autenticado
{
  id: UUID
  email: string
  nombre_completo: string
  rol: 'socio' | 'admin' | 'supervisor'
  activo: boolean
}

// Cliente con relaciones
{
  id: UUID
  numero_contrato: string
  nombre_completo: string
  gestor_id: UUID
  precio_venta: number
  descuento: number
  total_pagado: number
  saldo: number (calculado)
  estado: 'inicio' | 'activo' | 'pausa' | 'liquidado'
  calendario_pagos: CalendarioPago[]
  pagos_realizados: PagoRealizado[]
}

// Pago realizado
{
  id: UUID
  cliente_id: UUID
  fecha_pago: Date
  monto_pagado: number
  gestor_id?: UUID
  notas?: string
}

// Seguimiento
{
  id: UUID
  cliente_id: UUID
  usuario_id: UUID
  tipo_contacto: 'llamada' | 'whatsapp' | 'email'
  resultado: 'contactado' | 'no_contesto' | 'promesa_pago'
  fecha_contacto: Date
}
```

---

## 🎯 Validaciones (Zod schemas)

```typescript
// Login
{
  email: string().email().min(5),
  password: string().min(6).max(100)
}

// Cliente
{
  nombre_completo: string().min(3).max(100),
  telefono: string().regex(/^\d{10}$/),
  email: string().email(),
  precio_venta: number().positive(),
  descuento: number().nonnegative(),
  mensualidades: number().min(2).max(18),
  frecuencia_pago: enum(['quincenal', 'mensual']),
  dia_pago: number().min(1).max(31)
}

// Pago
{
  cliente_id: UUID,
  fecha_pago: Date,
  monto_pagado: number().positive()
}
```

---

## ⚡ Performance tips

```
Frontend
├── Usar React.memo para componentes costosos
├── Usar useCallback en event handlers
├── Usar useMemo en cálculos pesados
├── Virtualization en tablas grandes (TanStack Table)
├── Lazy loading de componentes
└── Code splitting por módulo

Backend
├── Índices en WHERE, JOIN, ORDER BY
├── Connection pooling (pg.Pool)
├── Validar antes de query
├── Query optimization (select fields needed)
├── Caching de gestores/usuarios (low change)
├── Batch operations donde sea posible
└── Logging en nivel INFO (no DEBUG en prod)

Database
├── Índices: estado, gestor_id, numero_contrato
├── VACUUM regularmente
├── ANALYZE para estadísticas
├── Monitoring de queries lentas
└── Backup diario
```

---

## 🐛 Checklist de QA

```
Autenticación
├── Login con credenciales correctas
├── Login con credenciales incorrectas (error)
├── Logout limpia token
├── Acceso a ruta protegida sin token → login
├── Token expirado → redirect a login

Clientes
├── CRUD completo (Create, Read, Update, Delete)
├── Búsqueda y filtros
├── Número de contrato auto-generado
├── Cambio de estado (inicio → activo → liquidado)
├── Cambio de gestor

Pagos
├── Registrar pago flexibles (cualquier monto)
├── Actualizar saldo cliente
├── Marcar cuota como pagada en calendario
├── Reversión de pago con motivo
├── Cartera vencida (atraso visible)

Reportes
├── Exportar a Excel
├── Exportar a PDF
├── Filtros funcionan
├── Cálculos correctos

Roles
├── Admin puede ver/editar clientes
├── Supervisor solo lectura
├── Socio acceso total
├── Validar permisos en cada acción
```

---

## 📅 Timeline esperado

```
Semana 1: Setup + Backend Base
├── Día 1-2: Setup ambiente, Tauri, PostgreSQL
├── Día 3-4: Express API setup
└── Día 5: Auth + primeras rutas

Semana 2: Módulos principales
├── Clientes CRUD
├── Pagos (registrar, reversión)
├── Gestores
└── Seguimientos

Semana 3: Frontend + Integración
├── Migrar componentes React
├── Conectar con API
├── Testing
└── Reportes

Semana 4: Pulido + Release
├── Build y empaquetamiento
├── Testing en VM Windows
├── Documentación
└── v1.0.0 Release
```

---

## 🔗 Referencias rápidas

- Documentación Tauri: https://tauri.app/
- Express docs: https://expressjs.com/
- PostgreSQL docs: https://www.postgresql.org/docs/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- Zustand: https://github.com/pmndrs/zustand
- Recharts: https://recharts.org/

---

## ✅ Checklist antes de comenzar

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 13+ instalado
- [ ] Git configurado
- [ ] Editor de código (VS Code)
- [ ] Entender arquitectura (leer PROMPT_DESKTOP_APP.md)
- [ ] Verificar endpoints en documentación
- [ ] PostgreSQL connection test OK
- [ ] Estructura de carpetas lista

---

**Última actualización:** Abril 2025
**Versión:** 1.0
**Status:** 🟢 Listo para usar
