# Guía Técnica: Migración de Supabase a PostgreSQL Local + Express

## 📋 Cambios principales en el código

### 1. **Reemplazar Supabase Client por HTTP Client**

#### Antes (Web con Supabase):
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
```

#### Después (Desktop con HTTP):
```typescript
// lib/api.ts
import axios from 'axios'

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
})

// Interceptor para agregar JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado, redirigir a login
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

---

### 2. **Adaptar Hooks Personalizados**

#### Antes (useClientes con Supabase):
```typescript
// hooks/useClientes.ts
import { useCallback, useState } from 'react'
import supabase from '@/lib/supabase'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchClientes = useCallback(async (filtros = {}) => {
    setLoading(true)
    try {
      let query = supabase.from('clientes').select('*')
      
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }
      
      const { data, error: supabaseError } = await query
      
      if (supabaseError) throw supabaseError
      setClientes(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ... más métodos

  return { clientes, loading, error, fetchClientes }
}
```

#### Después (useClientes con HTTP):
```typescript
// hooks/useClientes.ts
import { useCallback, useState } from 'react'
import api from '@/lib/api'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchClientes = useCallback(async (filtros = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filtros.estado) {
        params.append('estado', filtros.estado)
      }
      if (filtros.gestorId) {
        params.append('gestor_id', filtros.gestorId)
      }
      if (filtros.search) {
        params.append('search', filtros.search)
      }
      
      const { data } = await api.get('/clientes', { params })
      setClientes(data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const crearCliente = useCallback(async (clienteData) => {
    try {
      const { data } = await api.post('/clientes', clienteData)
      setClientes((prev) => [...prev, data.data])
      return data.data
    } catch (err) {
      throw err.response?.data?.message || err.message
    }
  }, [])

  const editarCliente = useCallback(async (id, clienteData) => {
    try {
      const { data } = await api.put(`/clientes/${id}`, clienteData)
      setClientes((prev) =>
        prev.map((c) => (c.id === id ? data.data : c))
      )
      return data.data
    } catch (err) {
      throw err.response?.data?.message || err.message
    }
  }, [])

  const eliminarCliente = useCallback(async (id) => {
    try {
      await api.delete(`/clientes/${id}`)
      setClientes((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      throw err.response?.data?.message || err.message
    }
  }, [])

  return {
    clientes,
    loading,
    error,
    fetchClientes,
    crearCliente,
    editarCliente,
    eliminarCliente,
  }
}
```

---

### 3. **Autenticación: Reemplazar Supabase Auth**

#### Antes (Supabase Auth):
```typescript
// store/authStore.ts
import { create } from 'zustand'
import supabase from '@/lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
  
  checkAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user, loading: false })
  },
}))
```

#### Después (JWT):
```typescript
// store/authStore.ts
import { create } from 'zustand'
import api from '@/lib/api'

interface Usuario {
  id: string
  email: string
  nombre_completo: string
  rol: 'socio' | 'admin' | 'supervisor'
}

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,

  login: async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password })
      
      localStorage.setItem('token', data.token)
      set({ user: data.usuario, token: data.token })
      
      return true
    } catch (error) {
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  verificarToken: async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        set({ loading: false })
        return false
      }

      const { data } = await api.get('/auth/verify')
      set({ user: data.usuario, token, loading: false })
      
      return true
    } catch (error) {
      localStorage.removeItem('token')
      set({ loading: false })
      return false
    }
  },
}))
```

---

### 4. **Estructura de Respuestas de API**

Todas las respuestas del backend Express deben seguir este patrón:

```typescript
// Respuesta exitosa
{
  success: true,
  data: { /* el objeto */ },
  message: "Operación exitosa"
}

// Respuesta con error
{
  success: false,
  error: "EMAIL_ALREADY_EXISTS",
  message: "El email ya está registrado",
  details: { /* información adicional */ }
}

// Respuesta con lista paginada
{
  success: true,
  data: [ /* array de objetos */ ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
}
```

---

### 5. **Endpoint de login en Express**

```typescript
// server/src/routes/auth.ts
import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '@/db/pool'

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email y contraseña requeridos'
      })
    }

    // Buscar usuario
    const result = await pool.query(
      'SELECT id, email, password_hash, nombre_completo, rol FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email o contraseña incorrectos'
      })
    }

    const usuario = result.rows[0]

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email o contraseña incorrectos'
      })
    }

    // Generar JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    )

    // Retornar token + usuario
    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Error al procesar login'
    })
  }
})

router.get('/verify', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      usuario: req.user
    })
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido'
    })
  }
})

export default router
```

---

### 6. **Middleware de Autenticación**

```typescript
// server/src/middleware/auth.ts
import jwt from 'jsonwebtoken'

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Token no proporcionado'
      })
    }

    const token = authHeader.substring(7)

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Token inválido o expirado'
    })
  }
}

export function roleMiddleware(...allowedRoles: string[]) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'No tienes permisos para acceder a este recurso'
      })
    }
    next()
  }
}
```

---

## 🔄 Migrando lógica de Supabase a Express

### Ejemplo: Crear cliente

#### Antes (Supabase):
```typescript
// Componente React
async function crearCliente(datos) {
  const { data, error } = await supabase
    .from('clientes')
    .insert([{
      ...datos,
      numero_contrato: null, // Auto-generado por trigger
      estado: 'inicio'
    }])
    .select()

  if (error) throw error
  
  // Generar calendario automáticamente
  const calendario = generarCalendarioPagos({
    ...datos,
    numero_pagos: calcularNumeroPagos(datos.frecuencia_pago, datos.mensualidades)
  })

  const { error: calError } = await supabase
    .from('calendarios_pagos')
    .insert(calendario)

  return data[0]
}
```

#### Después (Express + PostgreSQL):
```typescript
// Backend Express
async function crearCliente(req, res) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Insertar cliente
    const clienteResult = await client.query(
      `INSERT INTO clientes (
        gestor_id, nombre_completo, telefono_celular, email,
        precio_venta, descuento, estado, frecuencia_pago,
        mensualidades, monto_pago, dia_pago, fecha_inicio, fecha_primer_pago
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.body.gestor_id,
        req.body.nombre_completo,
        req.body.telefono_celular,
        req.body.email,
        req.body.precio_venta,
        req.body.descuento,
        'inicio',
        req.body.frecuencia_pago,
        req.body.mensualidades,
        req.body.monto_pago,
        req.body.dia_pago,
        req.body.fecha_inicio,
        req.body.fecha_primer_pago
      ]
    )

    const cliente = clienteResult.rows[0]

    // Generar calendario de pagos
    const numeroPagos = calcularNumeroPagos(
      req.body.frecuencia_pago,
      req.body.mensualidades
    )
    
    const calendario = generarCalendarioPagos({
      ...cliente,
      numero_pagos: numeroPagos
    })

    // Insertar calendario
    for (const cuota of calendario) {
      await client.query(
        `INSERT INTO calendarios_pagos (
          cliente_id, numero_cuota, fecha_programada,
          monto_programado, estado, saldo_pendiente
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cliente.id,
          cuota.numero_cuota,
          cuota.fecha_programada,
          cuota.monto_programado,
          'pendiente',
          cuota.monto_programado
        ]
      )
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      data: cliente,
      message: 'Cliente creado exitosamente'
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    res.status(400).json({
      success: false,
      error: 'CREATE_CLIENT_ERROR',
      message: error.message
    })
  } finally {
    client.release()
  }
}

// Rutas
router.post('/clientes', authMiddleware, roleMiddleware('socio', 'admin'), crearCliente)
```

---

## 💾 Gestión de conexión a PostgreSQL

```typescript
// server/src/db/pool.ts
import { Pool } from 'pg'

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'formex_db',
  user: process.env.DB_USER || 'formex_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

pool.on('error', (err) => {
  console.error('Error en pool de PostgreSQL:', err)
})

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ Conexión a PostgreSQL exitosa')
    return true
  } catch (error) {
    console.error('❌ Error de conexión a PostgreSQL:', error)
    return false
  }
}
```

---

## ⚙️ Tauri: Lanzar Express como Child Process

```typescript
// src-tauri/src/main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::process::{Command, Child};
use std::thread;
use std::time::Duration;

fn main() {
    let mut server_process: Option<Child> = None;

    // Lanzar servidor Express
    match Command::new("node")
        .args(&["server/dist/index.js"])
        .spawn()
    {
        Ok(mut child) => {
            println!("✅ Servidor Express iniciado (PID: {})", child.id());
            server_process = Some(child);
            
            // Esperar a que Express esté listo
            thread::sleep(Duration::from_secs(2));
        }
        Err(e) => {
            eprintln!("❌ Error al iniciar Express: {}", e);
        }
    }

    // Construir app de Tauri
    let context = tauri::generate_context!();
    
    tauri::Builder::default()
        .setup(move |app| {
            let app_handle = app.app_handle();
            
            // Listener para cuando la app se cierre
            app_handle.listen_global("tauri://close-requested", |_| {
                // Terminar proceso Express antes de cerrar
                if let Some(mut child) = server_process.take() {
                    let _ = child.kill();
                }
            });

            Ok(())
        })
        .run(context)
        .expect("Error al ejecutar aplicación Tauri");

    // Limpiar: matar proceso Express al cerrar
    if let Some(mut child) = server_process {
        let _ = child.kill();
    }
}
```

---

## 📊 Tipos compartidos Frontend-Backend

```typescript
// shared/types.ts (usado en Frontend Y Backend)

export interface Usuario {
  id: string
  email: string
  nombre_completo: string
  rol: 'socio' | 'admin' | 'supervisor'
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  numero_contrato: string
  gestor_id: string | null
  nombre_completo: string
  telefono_celular?: string
  email?: string
  precio_venta: number
  descuento: number
  total_pagado: number
  saldo: number
  frecuencia_pago: 'quincenal' | 'mensual'
  mensualidades: number
  numero_pagos: number
  monto_pago: number
  dia_pago: number
  estado: 'inicio' | 'activo' | 'pausa' | 'liquidado'
  created_at: string
  updated_at: string
}

export interface CalendarioPago {
  id: string
  cliente_id: string
  numero_cuota: number
  fecha_programada: string
  monto_programado: number
  estado: 'pendiente' | 'pagado' | 'parcialmente_pagado'
  saldo_pendiente: number
}

export interface PagoRealizado {
  id: string
  cliente_id: string
  gestor_id?: string
  fecha_pago: string
  monto_pagado: number
  notas?: string
  created_at: string
}
```

---

**✅ Con esta guía, la migración de Supabase a PostgreSQL + Express será mucho más clara y estructurada.**
