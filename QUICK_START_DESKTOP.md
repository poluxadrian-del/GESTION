# Quick Start: Guía de Inicio Rápido para la Migración

## 🚀 Empezar en 5 pasos

### Paso 1: Preparación de ambiente (30 minutos)

**Instalar requisitos:**

```powershell
# 1. Verificar Node.js (v18+)
node --version

# 2. Instalar PostgreSQL
# Descargar de: https://www.postgresql.org/download/windows/
# Durante instalación:
#   - Password: formex_password
#   - Puerto: 5432
#   - Instalar pgAdmin4 (sí)

# 3. Verificar PostgreSQL
psql --version
```

**Verificar instalación:**

```powershell
# Conectar a PostgreSQL
psql -U postgres

# En terminal de psql:
CREATE USER formex_user WITH PASSWORD 'formex_password';
CREATE DATABASE formex_db OWNER formex_user;
GRANT ALL PRIVILEGES ON DATABASE formex_db TO formex_user;
\q
```

---

### Paso 2: Crear proyecto Tauri (45 minutos)

```powershell
# 1. Crear nuevo proyecto Tauri
npm create tauri-app@latest

# Responder preguntas:
# ? Project name: formex-desktop
# ? Choose package manager: npm
# ? Choose UI template: React
# ? Choose TypeScript: Yes
# ? Choose ESLint: Yes

cd formex-desktop
```

**Verificar estructura:**

```
formex-desktop/
├── src/                    # React UI
├── src-tauri/              # Tauri config
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

### Paso 3: Configurar Backend Express (1 hora)

```powershell
# 1. Crear carpeta server
mkdir server
cd server

# 2. Inicializar proyecto Node
npm init -y

# 3. Instalar dependencias
npm install express pg jwt-simple bcryptjs cors dotenv axios
npm install -D typescript ts-node @types/node @types/express

# 4. Crear estructura
mkdir -p src/{routes,controllers,middleware,db,utils}

# 5. Crear tsconfig.json en server/
echo '{"compilerOptions":{"target":"ES2020","module":"commonjs","outDir":"./dist","strict":true},"include":["src"]}' > tsconfig.json
```

**Crear `.env` en server:**

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=formex_db
DB_USER=formex_user
DB_PASSWORD=formex_password
JWT_SECRET=your_super_secret_key_here_change_in_prod
JWT_EXPIRY=24h
```

---

### Paso 4: Crear archivo principal de Express (1 hora)

**server/src/index.ts:**

```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Pool de conexión
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

pool.on('error', (err) => {
  console.error('Error en pool:', err)
})

// Health check
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
    })
  } catch (error) {
    res.status(503).json({ status: 'error', message: error.message })
  }
})

// Rutas placeholder (agregadas después)
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando' })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  res.status(err.status || 500).json({
    error: err.message || 'Error interno',
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor Express corriendo en http://localhost:${PORT}`)
})

export { pool }
```

**Compilar y probar:**

```powershell
cd server

# Compilar TypeScript
npx tsc

# Probar servidor
node dist/index.js

# Debe mostrar:
# ✅ Servidor Express corriendo en http://localhost:3001

# Ctrl+C para detener
```

---

### Paso 5: Crear migraciones de base de datos (1 hora)

**server/src/db/001_init.sql:**

```sql
-- Crear enums
CREATE TYPE usuario_rol AS ENUM ('socio', 'admin', 'supervisor');
CREATE TYPE cliente_estado AS ENUM ('inicio', 'activo', 'pausa', 'liquidado');
CREATE TYPE pago_frecuencia AS ENUM ('quincenal', 'mensual');

-- Tabla usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol usuario_rol DEFAULT 'admin',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla gestores
CREATE TABLE gestores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato TEXT UNIQUE,
  gestor_id UUID REFERENCES gestores(id) ON DELETE SET NULL,
  nombre_completo TEXT NOT NULL,
  telefono_celular TEXT,
  email TEXT,
  precio_venta NUMERIC(15,2) DEFAULT 0,
  descuento NUMERIC(15,2) DEFAULT 0,
  total_pagado NUMERIC(15,2) DEFAULT 0,
  saldo NUMERIC(15,2) GENERATED ALWAYS AS (precio_venta - descuento - total_pagado) STORED,
  frecuencia_pago pago_frecuencia DEFAULT 'mensual',
  mensualidades INT CHECK (mensualidades >= 2 AND mensualidades <= 18),
  numero_pagos INT,
  monto_pago NUMERIC(15,2) DEFAULT 0,
  dia_pago INT CHECK (dia_pago >= 1 AND dia_pago <= 31),
  fecha_inicio DATE,
  fecha_primer_pago DATE,
  estado cliente_estado DEFAULT 'inicio',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla calendarios_pagos
CREATE TABLE calendarios_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  numero_cuota INT NOT NULL,
  fecha_programada DATE NOT NULL,
  monto_programado NUMERIC(15,2) NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  saldo_pendiente NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cliente_id, numero_cuota)
);

-- Tabla pagos_realizados
CREATE TABLE pagos_realizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  gestor_id UUID REFERENCES gestores(id),
  fecha_pago DATE NOT NULL,
  monto_pagado NUMERIC(15,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla seguimientos
CREATE TABLE seguimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  tipo_contacto VARCHAR(50),
  resultado VARCHAR(50),
  fecha_contacto TIMESTAMPTZ DEFAULT now(),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_gestor ON clientes(gestor_id);
CREATE INDEX idx_pagos_cliente ON pagos_realizados(cliente_id);
CREATE INDEX idx_calendarios_cliente ON calendarios_pagos(cliente_id);
CREATE INDEX idx_seguimientos_cliente ON seguimientos(cliente_id);

-- Insertar usuario demo
INSERT INTO usuarios (email, password_hash, nombre_completo, rol)
VALUES ('socio@formex.local', '$2b$10$HASH_AQUI', 'Administrador', 'socio');
```

**Ejecutar migración:**

```powershell
# Conectar como formex_user
psql -h localhost -U formex_user -d formex_db -f server/src/db/001_init.sql

# Ingresar contraseña: formex_password
```

**Verificar tablas creadas:**

```powershell
psql -h localhost -U formex_user -d formex_db

# En psql:
\dt           # Listar tablas
\q            # Salir
```

---

## 📋 Checklist de verificación

Después de completar los 5 pasos, verificar:

```powershell
# 1. PostgreSQL corriendo
psql -U postgres -c "SELECT version();"

# 2. Base de datos existe
psql -U formex_user -d formex_db -c "SELECT COUNT(*) FROM information_schema.tables;"

# 3. Express arranca
cd server && node dist/index.js
# Debe mostrar: ✅ Servidor Express corriendo en http://localhost:3001

# 4. Health check
curl http://localhost:3001/health
# Debe retornar JSON con status 'ok'

# 5. Tauri se abre
npm run tauri dev
# Debe abrir ventana de Tauri
```

---

## 🔄 Siguiente: Rutina de desarrollo

Después de setup inicial, el flujo de desarrollo es:

### Terminal 1: Backend Express
```powershell
cd server
npm run dev
# O compilar y correr
npm run build
node dist/index.js
```

### Terminal 2: Frontend Tauri
```powershell
# En raíz del proyecto
npm run tauri dev
```

### Terminal 3: PostgreSQL (si no está como servicio)
```powershell
# Si PostgreSQL no está como servicio de Windows:
"C:\Program Files\PostgreSQL\15\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\15\data"
```

---

## 🐛 Troubleshooting rápido

| Problema | Solución |
|---|---|
| `ECONNREFUSED localhost:5432` | PostgreSQL no está corriendo. Reiniciar servicio. |
| `FATAL: role "formex_user" does not exist` | Ejecutar comandos de creación de usuario/BD. |
| `Module not found: 'pg'` | En carpeta `server/`, ejecutar `npm install pg`. |
| `Port 3001 already in use` | Cambiar puerto en `.env` o matar proceso anterior. |
| `Tauri window not opening` | Verificar que Express está corriendo en http://localhost:3001 |

---

## 📁 Estructura después de Paso 5

```
formex-desktop/
├── src/                          # Frontend React (todavía vacío)
├── src-tauri/
├── server/
│   ├── src/
│   │   ├── index.ts             # ✅ Creado
│   │   ├── db/
│   │   │   └── 001_init.sql     # ✅ Creado
│   │   ├── routes/              # (próximamente)
│   │   ├── controllers/         # (próximamente)
│   │   └── middleware/          # (próximamente)
│   ├── dist/                     # (generado al compilar)
│   ├── .env                      # ✅ Creado
│   ├── package.json              # ✅ Creado
│   └── tsconfig.json             # ✅ Creado
├── vite.config.ts
├── package.json
└── .env.example
```

---

## 🎯 Próximo paso

Después de completar estos 5 pasos:

1. ✅ Ambiente configurado
2. ✅ Proyecto Tauri creado
3. ✅ Backend Express corriendo
4. ✅ Base de datos PostgreSQL funcional
5. ✅ Migraciones ejecutadas

**Siguiente:** 
- Crear rutas API en Express (login, clientes CRUD, etc.)
- Migrar componentes React al frontend
- Conectar Frontend con Backend

---

## 📞 Ayuda

Si algo no funciona:

1. Verificar archivos `.env` (rutas, contraseñas)
2. Revisar logs en terminal
3. Asegurarse que PostgreSQL está corriendo
4. Usar `curl http://localhost:3001/health` para testear API
5. Conectarse a PostgreSQL con pgAdmin para verificar tablas

---

**¡Listo para comenzar! Cualquier duda, revisar los documentos detallados:**
- `PROMPT_DESKTOP_APP.md` — Especificación completa
- `GUIA_MIGRACION_TECNICA.md` — Ejemplos de código
- `RESUMEN_EJECUTIVO_DESKTOP.md` — Visión general
