# Resumen Ejecutivo: Migración de Formex a App de Escritorio (Tauri)

## 🎯 Objetivo

Transformar **Formex** (aplicación web de gestión de cobranza) en una **aplicación de escritorio nativa para Windows** usando:
- **Tauri** (framework desktop ligero)
- **React + TypeScript** (frontend)
- **Node.js + Express** (backend API local)
- **PostgreSQL** (base de datos local)

---

## ✨ Ventajas de la migración

| Característica | Web | Desktop |
|---|---|---|
| Funciona sin internet | ❌ | ✅ |
| Performance | Media | Excelente |
| Instalación | URL en navegador | .msi Installer |
| Backup de datos | Automático (cloud) | Manual o scheduled |
| Privacidad | Datos en cloud | Datos locales |
| Costo | Supabase (pago) | Solo PostgreSQL + mantenimiento |
| UX | Navegador web | Aplicación nativa |
| Offline-first | No | Sí |

---

## 📊 Análisis del Proyecto Actual

### Módulos principales
```
✅ Dashboard            - Métricas y gráficas
✅ Clientes             - CRUD + importación Excel
✅ Cobranza             - Registrar pagos, calendario, cartera vencida
✅ Gestores             - CRUD de gestores
✅ Comisiones           - Cálculo automático y reportes
✅ Seguimientos         - Registrar contactos (llamada, email, WhatsApp)
✅ Reportes             - Exportación Excel/PDF
✅ Usuarios             - Gestión de usuarios (Socio)
```

### Stack actual
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL managed)
- **Autenticación:** Supabase Auth
- **Estado:** Zustand
- **Tablas:** TanStack Table v8
- **Gráficas:** Recharts

### Base de datos
```sql
Tablas: usuarios, gestores, clientes, calendarios_pagos, 
        pagos_realizados, seguimientos, comisiones
Esquema: ~8 tablas, 50+ campos
Índices: Performance optimizado
```

---

## 🏗️ Arquitectura propuesta

```
┌─────────────────────────────────────────────────────┐
│                   Windows Usuario                    │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────▼────────────────┐
        │   Tauri App (Ejecutable)    │ Windows Process
        │  ┌─────────────────────────┐│
        │  │  React UI (Vite Build)  ││ localhost:5173
        │  │  • Componentes React    ││
        │  │  • Zustand stores       ││
        │  │  • Tailwind + shadcn/ui ││
        │  └──────────┬──────────────┘│
        │             │               │
        │         HTTP Calls          │
        │             │               │
        │  ┌──────────▼──────────────┐│
        │  │ Express API Server      ││ localhost:3001
        │  │ • Rutas & Controladores││
        │  │ • Lógica de negocio    ││
        │  │ • Autenticación JWT    ││
        │  │ • Validaciones         ││
        │  └──────────┬──────────────┘│
        │             │               │
        │         SQL Queries         │
        │             │               │
        │  ┌──────────▼──────────────┐│
        │  │   PostgreSQL (BD)       ││ localhost:5432
        │  │ • Datos persistentes    ││
        │  │ • Triggers & Funciones  ││
        │  │ • Índices               ││
        │  └─────────────────────────┘│
        │                             │
        │ (Todo en una sola máquina) │
        └─────────────────────────────┘
```

---

## 📁 Estructura de carpetas (Final)

```
formex-desktop/
├── src/                      # Frontend React (migrado)
│   ├── components/           # Reutilizar 100%
│   ├── pages/
│   ├── hooks/                # Adaptar para HTTP
│   ├── store/
│   ├── lib/
│   │   ├── api.ts           # ← Cliente HTTP (nuevo)
│   │   └── auth.ts          # ← JWT auth (nuevo)
│   ├── types/
│   ├── utils/
│   ├── validations/
│   └── index.css
│
├── server/                   # Backend Express (nuevo)
│   ├── src/
│   │   ├── index.ts         # Punto de entrada
│   │   ├── routes/          # API endpoints
│   │   ├── controllers/     # Lógica de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── middleware/      # Auth, roles, errors
│   │   ├── db/
│   │   │   ├── pool.ts      # Conexión PostgreSQL
│   │   │   └── migrations/  # SQL migraciones
│   │   └── utils/
│   ├── dist/                # Build compilado
│   ├── package.json
│   └── tsconfig.json
│
├── src-tauri/               # Configuración Tauri
│   ├── src/
│   │   └── main.rs          # Lanzar Express
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── vite.config.ts
├── tailwind.config.js
├── package.json             # Scripts para dev/build
└── .env.example
```

---

## 🔄 Cambios principales en código

### 1. **Base de datos**
- ❌ Supabase Auth
- ✅ PostgreSQL local + JWT

### 2. **Cliente API**
- ❌ `supabase.from('tabla').select()`
- ✅ `api.get('/ruta')`

### 3. **Autenticación**
- ❌ Supabase Auth
- ✅ JWT en localStorage + Backend

### 4. **Hooks personalizados**
- ❌ `supabase.from().select().eq()`
- ✅ `api.get('/api/ruta', { params })`

### 5. **Middleware**
- ❌ RLS (Row Level Security) en Supabase
- ✅ JWT + Middleware de roles en Express

---

## 📋 Fases de implementación

### **Fase 1: Setup Base** (1-2 días)
- [ ] Crear proyecto Tauri v2
- [ ] Configurar Vite + React + TypeScript
- [ ] Crear carpeta `server/` con Express
- [ ] Setup PostgreSQL + esquema inicial
- [ ] Setup autenticación JWT

### **Fase 2: API Backend** (3-5 días)
- [ ] Implementar todas las rutas REST
- [ ] Controllers y servicios
- [ ] Middleware de autenticación y roles
- [ ] Validaciones con Zod/Joi
- [ ] Manejo centralizado de errores

### **Fase 3: Frontend Tauri** (5-7 días)
- [ ] Migrar componentes React (sin cambios visuales)
- [ ] Reemplazar Supabase con cliente HTTP
- [ ] Adaptar hooks personalizados
- [ ] Setup Zustand stores
- [ ] Página de Login

### **Fase 4: Módulos principales** (5-7 días)
- [ ] Dashboard (reutilizar)
- [ ] Clientes (CRUD completo)
- [ ] Cobranza (pagos + calendario)
- [ ] Gestores, Comisiones, Seguimientos
- [ ] Reportes y exportación

### **Fase 5: Features avanzadas** (2-3 días)
- [ ] Importación Excel
- [ ] Exportación PDF
- [ ] Backup automático
- [ ] Búsqueda y filtros avanzados

### **Fase 6: Setup automático** (1-2 días)
- [ ] Script de instalación PostgreSQL
- [ ] Migraciones automáticas
- [ ] Usuarios de demostración
- [ ] Healthcheck en startup

### **Fase 7: Build y testing** (2-3 días)
- [ ] Build de Tauri (MSI)
- [ ] Testing en VM Windows limpia
- [ ] Documentación
- [ ] Release v1.0.0

**⏱️ Tiempo estimado total: 3-4 semanas**

---

## 🔐 Seguridad y Consideraciones

### Autenticación
✅ JWT con expiración (24 horas)
✅ Refresh tokens (opcional)
✅ Contraseñas hasheadas con bcrypt
✅ CORS restringido a localhost

### Base de datos
✅ Índices en columnas de búsqueda frecuente
✅ Validación de datos en backend
✅ Transacciones para operaciones críticas
✅ Logs de auditoría (opcional)

### Aplicación
✅ No almacenar contraseñas en localStorage
✅ Sanitizar inputs
✅ Validación en frontend Y backend
✅ Manejo de errores amigable

---

## 📦 Instalación para usuario final

**Proceso:**

1. Descargar `Formex_Setup.msi` desde sitio web
2. Ejecutar instalador (Next > Next > Finish)
3. App se abre automáticamente
4. Detecta PostgreSQL:
   - Si existe: usar instalación actual
   - Si no existe: mostrar instrucción de descarga
5. Primer login con usuario demo:
   - Email: `socio@formex.local`
   - Password: `password123`
6. Crear más usuarios desde Settings

---

## 💻 Requerimientos del sistema

**Mínimo:**
- Windows 10 (build 17763+)
- 4 GB RAM
- 500 MB espacio libre
- PostgreSQL 13+

**Recomendado:**
- Windows 11
- 8 GB RAM
- 1 GB espacio libre
- PostgreSQL 15+

---

## 📊 Comparativa: Web vs Desktop

| Aspecto | Web (Actual) | Desktop (Propuesto) |
|---------|---|---|
| **Acceso** | URL en navegador | Aplicación instalada |
| **Conexión** | Internet obligatoria | Funciona offline |
| **Base de datos** | Supabase (cloud) | PostgreSQL local |
| **API** | Supabase JS | Express REST |
| **Performance** | Media (latencia) | Excelente (local) |
| **Backup** | Automático | Manual/Scheduled |
| **Costo** | Supabase pagado | Solo PostgreSQL |
| **Escalabilidad** | Multi-tenant posible | Single-tenant |
| **Interfaz** | Web responsive | Desktop nativa |
| **Rol usuario** | Socio, Admin, Supervisor | Socio, Admin, Supervisor |

---

## 🎓 Stack técnico por componente

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND TAURI                    │
│  React 18 | TypeScript | Vite | Tailwind CSS       │
│  shadcn/ui | React Hook Form | Zod | Zustand      │
│  TanStack Table | Recharts | Axios                 │
└─────────────────────────────────────────────────────┘
                         ↓
         HTTP (Axios) ← → REST API (Express)
                         ↓
┌─────────────────────────────────────────────────────┐
│                  BACKEND EXPRESS                    │
│  Node.js | TypeScript | Express | JWT              │
│  Knex.js | Winston Logs | Zod Validation          │
│  CORS | Error Handling | Role-based Access        │
└─────────────────────────────────────────────────────┘
                         ↓
         SQL (node-postgres) ← → PostgreSQL
                         ↓
┌─────────────────────────────────────────────────────┐
│              DATABASE PostgreSQL 13+                │
│  8 Tablas | Enums | Índices | Triggers            │
│  Migraciones versionadas | Seeds                   │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de validación

### Antes de empezar
- [ ] Analizar 100% del código web actual ✅ (realizado)
- [ ] Identificar dependencias críticas ✅ (Supabase, JWT, roles)
- [ ] Documentar esquema de BD ✅ (completado)
- [ ] Crear plan de migracion ✅ (este documento)

### Durante desarrollo
- [ ] Mantener UI/UX idéntica
- [ ] Reutilizar componentes React
- [ ] Validar que roles funcionan igual
- [ ] Testing en cada fase

### Antes de release
- [ ] Testing completo en Windows 10 + 11
- [ ] Documentación de usuario
- [ ] Script de desinstalación
- [ ] Plan de backup/restore

---

## 🚀 Próximos pasos

1. **Crear proyecto Tauri base**
   ```bash
   npm create tauri-app@latest formex-desktop
   ```

2. **Inicializar Backend Express**
   ```bash
   mkdir server
   cd server
   npm init -y
   npm install express pg jwt bcryptjs cors dotenv
   ```

3. **Setup PostgreSQL**
   - Descargar PostgreSQL 13+
   - Crear usuario `formex_user`
   - Crear BD `formex_db`
   - Ejecutar migraciones

4. **Migrar componentes React**
   - Copiar carpeta `src/components` al nuevo proyecto
   - Reemplazar cliente Supabase con cliente HTTP
   - Adaptar hooks

5. **Implementar API Express**
   - Rutas de autenticación
   - Rutas CRUD de clientes, pagos, etc.
   - Middleware de autenticación

6. **Testing y ajustes**
   - Testing manual de flujos principales
   - Optimización de performance
   - Build final

---

## 📞 Soporte

Para preguntas durante la implementación:
- Consultar documentos adjuntos
- Revisar ejemplos de código proporcionados
- Testear en máquina local primero
- Usar VM Windows para testing del instalador

---

## 📄 Documentos relacionados

1. **PROMPT_DESKTOP_APP.md** — Especificación técnica completa
2. **GUIA_MIGRACION_TECNICA.md** — Ejemplos de código y migraciones
3. **prompt_Formex.md** — Especificación del proyecto web original

---

**✨ ¡Listo para comenzar la migración a aplicación de escritorio!**

Versión: 1.0
Fecha: Abril 2025
Status: 🟢 Preparado para implementación
