# Estrategia de Backup: Local → Supabase (Diario Manual)

## 🎯 Objetivo

Implementar un sistema de **backup diario manual** que sincronice datos de PostgreSQL local a **Supabase como alternativa de respaldo**, permitiendo:

- ✅ Backup manual con un botón en la UI
- ✅ Sincronización automática diaria (schedulada)
- ✅ Recovery rápido si falla PostgreSQL local
- ✅ Mantener Supabase como punto de recuperación

---

## 🏗️ Arquitectura

```
┌──────────────────────────────────┐
│    Formex Desktop (Tauri)        │
│                                  │
│  ┌─ UI: Settings                 │
│  │ [Backup Now] [Restore]        │
│  │ Last backup: 2025-04-28 02:00 │
│  └─────────────────┬──────────────┤
│                    │              │
│  ┌────────────────▼────────────┐  │
│  │  Express Backend            │  │
│  │                             │  │
│  │  POST /api/admin/backup     │  │
│  │  GET  /api/admin/backup-log │  │
│  │  POST /api/admin/restore    │  │
│  └─────────────┬───────────────┘  │
│                │                  │
└────────────────┼──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │  PostgreSQL Local         │
        │  (BD Principal)           │
        │  ├─ clientes             │
        │  ├─ pagos_realizados     │
        │  ├─ usuarios             │
        │  └─ seguimientos         │
        └────────┬──────────────────┘
                 │
      ┌──────────▼───────────────────────┐
      │  Exportar como JSON               │
      │  ├─ clientes.json                │
      │  ├─ pagos_realizados.json        │
      │  ├─ usuarios.json                │
      │  ├─ seguimientos.json            │
      │  └─ backup_manifest.json         │
      └──────────┬───────────────────────┘
                 │
      ┌──────────▼───────────────────────┐
      │  Supabase (Cloud)                │
      │                                  │
      │  Storage (backup bucket)         │
      │  └─ backups/                     │
      │     └─ 2025-04-29-020000/       │
      │        ├─ clientes.json         │
      │        ├─ pagos_realizados.json │
      │        ├─ usuarios.json         │
      │        └─ manifest.json         │
      │                                  │
      │  (Para recovery si falla local)  │
      └────────────────────────────────┘
```

---

## 📋 Implementación paso a paso

### Paso 1: Crear tabla de registro de backups

**server/src/db/002_backup_log.sql:**

```sql
-- Tabla para registrar intentos de backup
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo ENUM ('manual', 'automático'),
  estado ENUM ('pendiente', 'exitoso', 'fallido'),
  fecha_inicio TIMESTAMPTZ DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  registros_respaldados INT,
  tamaño_bytes BIGINT,
  ubicación_respaldo TEXT,  -- Ruta en Supabase o local
  motivo_error TEXT,        -- Si falló
  creado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_backup_logs_estado ON backup_logs(estado);
CREATE INDEX idx_backup_logs_fecha ON backup_logs(created_at DESC);
```

---

### Paso 2: Servicio de Backup en Express

**server/src/services/backupService.ts:**

```typescript
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

interface BackupResult {
  success: boolean
  backupId: string
  timestamp: string
  recordCount: number
  location: string
  message: string
}

interface BackupData {
  usuarios: any[]
  gestores: any[]
  clientes: any[]
  calendarios_pagos: any[]
  pagos_realizados: any[]
  seguimientos: any[]
  comisiones: any[]
}

export class BackupService {
  private pool: Pool
  private supabase: any
  private backupDir: string

  constructor(pool: Pool) {
    this.pool = pool
    
    // Inicializar cliente Supabase
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Key de servicio (con acceso completo)
    )

    // Directorio local para backups
    this.backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  /**
   * Realizar backup manual
   */
  async performBackup(userId: string, tipo: 'manual' | 'automático' = 'manual'): Promise<BackupResult> {
    const backupId = uuid()
    const timestamp = new Date().toISOString()
    
    try {
      console.log(`[${timestamp}] Iniciando backup ${tipo}...`)

      // Registrar intento en BD
      await this.pool.query(
        `INSERT INTO backup_logs (id, tipo, estado, creado_por) 
         VALUES ($1, $2, $3, $4)`,
        [backupId, tipo, 'pendiente', userId]
      )

      // 1. Exportar datos de PostgreSQL local
      const backupData = await this.exportData()

      // 2. Guardar localmente
      const localPath = await this.saveBackupLocally(backupId, backupData)

      // 3. Sincronizar a Supabase
      const supabaseLocation = await this.uploadToSupabase(backupId, backupData)

      // 4. Actualizar registro de backup
      await this.pool.query(
        `UPDATE backup_logs 
         SET estado = $1, fecha_fin = $2, registros_respaldados = $3, 
             tamaño_bytes = $4, ubicación_respaldo = $5
         WHERE id = $6`,
        [
          'exitoso',
          new Date(),
          await this.countRecords(backupData),
          fs.statSync(localPath).size,
          supabaseLocation,
          backupId
        ]
      )

      console.log(`✅ Backup ${backupId} completado exitosamente`)

      return {
        success: true,
        backupId,
        timestamp,
        recordCount: await this.countRecords(backupData),
        location: supabaseLocation,
        message: `Backup realizado en ${supabaseLocation}`
      }

    } catch (error) {
      console.error(`❌ Error en backup ${backupId}:`, error)

      // Registrar error en BD
      await this.pool.query(
        `UPDATE backup_logs 
         SET estado = $1, fecha_fin = $2, motivo_error = $3
         WHERE id = $4`,
        ['fallido', new Date(), error.message, backupId]
      )

      throw {
        success: false,
        backupId,
        message: `Error en backup: ${error.message}`
      }
    }
  }

  /**
   * Exportar todas las tablas como JSON
   */
  private async exportData(): Promise<BackupData> {
    const tables: (keyof BackupData)[] = [
      'usuarios',
      'gestores',
      'clientes',
      'calendarios_pagos',
      'pagos_realizados',
      'seguimientos',
      'comisiones'
    ]

    const data: BackupData = {} as BackupData

    for (const table of tables) {
      const result = await this.pool.query(`SELECT * FROM ${table}`)
      data[table] = result.rows
    }

    return data
  }

  /**
   * Guardar backup localmente (para recuperación rápida)
   */
  private async saveBackupLocally(backupId: string, data: BackupData): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0]
    const backupPath = path.join(this.backupDir, `backup_${timestamp}_${backupId}.json`)

    const manifest = {
      backupId,
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: Object.keys(data),
      recordCounts: Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value.length : 0
        return acc
      }, {} as Record<string, number>)
    }

    const backupFile = {
      manifest,
      data
    }

    fs.writeFileSync(
      backupPath,
      JSON.stringify(backupFile, null, 2)
    )

    console.log(`✅ Backup local guardado en: ${backupPath}`)
    return backupPath
  }

  /**
   * Subir backup a Supabase Storage
   */
  private async uploadToSupabase(backupId: string, data: BackupData): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0]
    const bucketPath = `backups/${timestamp}/${backupId}`

    try {
      // Crear JSON con datos
      const backupContent = JSON.stringify({
        manifest: {
          backupId,
          timestamp: new Date().toISOString(),
          version: '1.0',
          recordCounts: Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = Array.isArray(value) ? value.length : 0
            return acc
          }, {})
        },
        data
      }, null, 2)

      // Subir a Supabase Storage
      const { data: uploadData, error } = await this.supabase
        .storage
        .from('backups')
        .upload(`${bucketPath}/backup.json`, backupContent, {
          contentType: 'application/json',
          upsert: false
        })

      if (error) throw error

      const supabaseUrl = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/backups/${bucketPath}/backup.json`
      
      console.log(`✅ Backup subido a Supabase: ${bucketPath}`)
      return supabaseUrl

    } catch (error) {
      console.error('Error al subir a Supabase:', error)
      throw new Error(`No se pudo subir backup a Supabase: ${error.message}`)
    }
  }

  /**
   * Contar registros en backup
   */
  private async countRecords(data: BackupData): Promise<number> {
    return Object.values(data).reduce((total, table) => {
      return total + (Array.isArray(table) ? table.length : 0)
    }, 0)
  }

  /**
   * Obtener historial de backups
   */
  async getBackupHistory(limit: number = 10) {
    const result = await this.pool.query(
      `SELECT 
        id, tipo, estado, fecha_inicio, fecha_fin,
        registros_respaldados, tamaño_bytes, motivo_error,
        created_at
      FROM backup_logs
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    )

    return result.rows.map(row => ({
      ...row,
      duracion_segundos: row.fecha_fin 
        ? Math.round((new Date(row.fecha_fin).getTime() - new Date(row.fecha_inicio).getTime()) / 1000)
        : null
    }))
  }

  /**
   * Restaurar desde backup local
   */
  async restoreFromLocalBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Buscar archivo de backup
      const files = fs.readdirSync(this.backupDir)
      const backupFile = files.find(f => f.includes(backupId))

      if (!backupFile) {
        throw new Error(`Backup ${backupId} no encontrado`)
      }

      const filePath = path.join(this.backupDir, backupFile)
      const backupContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      // Restaurar datos
      await this.restoreData(backupContent.data)

      console.log(`✅ Datos restaurados desde backup ${backupId}`)

      return {
        success: true,
        message: `Restauración completada. ${backupContent.manifest.recordCounts} registros restaurados.`
      }

    } catch (error) {
      console.error('Error al restaurar:', error)
      throw error
    }
  }

  /**
   * Restaurar desde Supabase (en caso de emergencia)
   */
  async restoreFromSupabaseBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Descargar desde Supabase Storage
      const timestamp = new Date().toISOString().split('T')[0]
      const { data, error } = await this.supabase
        .storage
        .from('backups')
        .download(`backups/${timestamp}/${backupId}/backup.json`)

      if (error) throw error

      const backupContent = JSON.parse(await data.text())

      // Restaurar datos
      await this.restoreData(backupContent.data)

      console.log(`✅ Datos restaurados desde Supabase backup ${backupId}`)

      return {
        success: true,
        message: `Restauración desde Supabase completada. ${Object.values(backupContent.data).flat().length} registros restaurados.`
      }

    } catch (error) {
      console.error('Error al restaurar desde Supabase:', error)
      throw error
    }
  }

  /**
   * Restaurar datos en la BD
   */
  private async restoreData(data: BackupData): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Limpiar tablas existentes
      const tables = [
        'seguimientos',      // Primero las que dependen de otras
        'comisiones',
        'pagos_realizados',
        'calendarios_pagos',
        'clientes',
        'gestores',
        'backup_logs',
        'usuarios'
      ]

      for (const table of tables) {
        await client.query(`TRUNCATE ${table} CASCADE`)
      }

      // Restaurar datos en orden
      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || rows.length === 0) continue

        const columns = Object.keys(rows[0])
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

        for (const row of rows) {
          const values = columns.map(col => row[col])
          const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
          
          try {
            await client.query(query, values)
          } catch (insertError) {
            console.warn(`Advertencia al insertar en ${table}:`, insertError.message)
          }
        }
      }

      await client.query('COMMIT')
      console.log('✅ Restauración de datos completada')

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Limpiar backups antiguos (> 30 días)
   */
  async cleanOldBackups(daysToKeep: number = 30): Promise<number> {
    let deletedCount = 0

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      // Limpiar localmente
      const files = fs.readdirSync(this.backupDir)
      for (const file of files) {
        const filePath = path.join(this.backupDir, file)
        const stats = fs.statSync(filePath)

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath)
          deletedCount++
        }
      }

      console.log(`✅ Limpiados ${deletedCount} backups antiguos`)
      return deletedCount

    } catch (error) {
      console.error('Error al limpiar backups:', error)
      return 0
    }
  }
}
```

---

### Paso 3: Rutas de API

**server/src/routes/admin.ts:**

```typescript
import express from 'express'
import { BackupService } from '@/services/backupService'
import { authMiddleware, roleMiddleware } from '@/middleware/auth'
import { pool } from '@/db/pool'

const router = express.Router()
const backupService = new BackupService(pool)

/**
 * POST /api/admin/backup
 * Realizar backup manual inmediato
 */
router.post('/backup', 
  authMiddleware,
  roleMiddleware('socio'),
  async (req, res) => {
    try {
      const result = await backupService.performBackup(req.user.id, 'manual')
      
      res.json({
        success: true,
        data: result,
        message: 'Backup realizado exitosamente'
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'BACKUP_ERROR',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/admin/backup-history
 * Obtener historial de backups
 */
router.get('/backup-history',
  authMiddleware,
  roleMiddleware('socio'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10
      const history = await backupService.getBackupHistory(limit)
      
      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'HISTORY_ERROR',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/admin/restore-local
 * Restaurar desde backup local
 */
router.post('/restore-local',
  authMiddleware,
  roleMiddleware('socio'),
  async (req, res) => {
    try {
      const { backupId } = req.body

      const result = await backupService.restoreFromLocalBackup(backupId)
      
      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'RESTORE_ERROR',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/admin/restore-supabase
 * Restaurar desde Supabase (emergencia)
 */
router.post('/restore-supabase',
  authMiddleware,
  roleMiddleware('socio'),
  async (req, res) => {
    try {
      const { backupId } = req.body

      const result = await backupService.restoreFromSupabaseBackup(backupId)
      
      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'RESTORE_ERROR',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/admin/clean-backups
 * Eliminar backups > 30 días
 */
router.post('/clean-backups',
  authMiddleware,
  roleMiddleware('socio'),
  async (req, res) => {
    try {
      const daysToKeep = req.body.daysToKeep || 30
      const deleted = await backupService.cleanOldBackups(daysToKeep)
      
      res.json({
        success: true,
        data: { deletedCount: deleted },
        message: `${deleted} backups antiguos eliminados`
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'CLEANUP_ERROR',
        message: error.message
      })
    }
  }
)

export default router
```

---

### Paso 4: Scheduler automático (opcional)

**server/src/services/schedulerService.ts:**

```typescript
import cron from 'node-cron'
import { BackupService } from './backupService'
import { pool } from '@/db/pool'

export function initializeScheduler() {
  const backupService = new BackupService(pool)

  // Backup automático diario a las 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[SCHEDULER] Iniciando backup automático diario...')
      
      const result = await backupService.performBackup(
        'system', // userId del sistema
        'automático'
      )
      
      console.log('[SCHEDULER] ✅ Backup automático completado:', result.backupId)
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error en backup automático:', error)
    }
  })

  // Limpiar backups antiguos cada lunes a las 3 AM
  cron.schedule('0 3 * * 1', async () => {
    try {
      console.log('[SCHEDULER] Limpiando backups antiguos...')
      const deleted = await backupService.cleanOldBackups(30)
      console.log('[SCHEDULER] ✅ Limpieza completada:', deleted, 'backups eliminados')
    } catch (error) {
      console.error('[SCHEDULER] ❌ Error en limpieza:', error)
    }
  })

  console.log('✅ Scheduler iniciado')
}
```

---

### Paso 5: Componente React (UI)

**src/components/admin/BackupManager.tsx:**

```typescript
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface BackupLog {
  id: string
  tipo: 'manual' | 'automático'
  estado: 'exitoso' | 'fallido' | 'pendiente'
  fecha_inicio: string
  registros_respaldados: number
  tamaño_bytes: number
  motivo_error?: string
  duracion_segundos?: number
}

export function BackupManager() {
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<BackupLog[]>([])
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/admin/backup-history?limit=10')
      setHistory(data.data)
    } catch (error) {
      toast.error('Error al cargar historial de backups')
    }
  }

  const handleBackupNow = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/admin/backup', {})
      toast.success(`✅ Backup completado: ${data.data.recordCount} registros`)
      fetchHistory()
    } catch (error) {
      toast.error('❌ Error en backup: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    if (!window.confirm('⚠️ ¿Restaurar este backup? Se sobrescribirán los datos actuales.')) {
      return
    }

    setRestoring(true)
    try {
      const { data } = await api.post('/admin/restore-local', { backupId })
      toast.success(data.data.message)
      fetchHistory()
    } catch (error) {
      toast.error('❌ Error en restauración: ' + error.message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Backups</h2>
        <Button 
          onClick={handleBackupNow} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading ? '⏳ Respaldando...' : '💾 Backup Ahora'}
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Backups</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Fecha</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-center p-2">Estado</th>
                <th className="text-center p-2">Registros</th>
                <th className="text-center p-2">Duración</th>
                <th className="text-right p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {history.map((backup) => (
                <tr key={backup.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    {new Date(backup.fecha_inicio).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {backup.tipo === 'manual' ? '👤 Manual' : '🤖 Automático'}
                  </td>
                  <td className="p-2 text-center">
                    {backup.estado === 'exitoso' && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✅ Exitoso
                      </span>
                    )}
                    {backup.estado === 'fallido' && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                        ❌ Fallido
                      </span>
                    )}
                    {backup.estado === 'pendiente' && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        ⏳ Pendiente
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {backup.registros_respaldados?.toLocaleString()}
                  </td>
                  <td className="p-2 text-center">
                    {backup.duracion_segundos ? `${backup.duracion_segundos}s` : '-'}
                  </td>
                  <td className="p-2 text-right">
                    {backup.estado === 'exitoso' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoring}
                      >
                        🔄 Restaurar
                      </Button>
                    )}
                    {backup.estado === 'fallido' && (
                      <span className="text-red-500 text-xs">
                        {backup.motivo_error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-2">📋 Información</h3>
        <ul className="text-sm space-y-2">
          <li>✅ Backup automático diario a las 2:00 AM</li>
          <li>✅ Se guarda localmente en: <code>backups/</code></li>
          <li>✅ Se sincroniza automáticamente a Supabase</li>
          <li>✅ Se retienen backups de los últimos 30 días</li>
          <li>⚠️ La restauración sobrescribe los datos actuales</li>
        </ul>
      </Card>
    </div>
  )
}
```

---

## ⚙️ Configuración (server/.env)

```env
# Base de datos local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=formex_db
DB_USER=formex_user
DB_PASSWORD=your_password

# Supabase (para backups)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key  # ⚠️ Guardar seguro!

# Scheduler
ENABLE_BACKUP_SCHEDULER=true
```

---

## 🎯 Flujo de uso

### Backup manual diario

```
Usuario abre Settings
        │
        ▼
    [💾 Backup Ahora]
        │
        ├─► Exporta todas las tablas
        ├─► Guarda JSON localmente
        ├─► Sube a Supabase Storage
        ├─► Registra en BD
        │
        ▼
    ✅ Notificación: "Backup completado"
```

### Restauración (si falla PostgreSQL local)

```
Usuario abre Settings → Restore
        │
        ├─► Ver historial de backups
        │
        ├─► Seleccionar backup
        │
        ├─► Confirmar (⚠️ Warning)
        │
        ├─► Restaurar desde:
        │   ├─ Archivo local (rápido)
        │   ├─ Supabase (si local no existe)
        │
        ▼
    ✅ Datos restaurados
```

---

## 📊 Ventajas de esta estrategia

| Aspecto | Beneficio |
|--------|----------|
| **Doble respaldo** | Local + Supabase |
| **Recuperación rápida** | Backup local siempre disponible |
| **Fallback automático** | Si local falla, usar Supabase |
| **Historial auditable** | Tabla `backup_logs` |
| **Limpieza automática** | Backups > 30 días se eliminan |
| **Control total** | Usuario puede hacer backup manual |
| **Zero downtime** | La app sigue funcionando durante backup |

---

## 🔒 Seguridad

```typescript
// Solo Socio puede hacer backup/restore
roleMiddleware('socio')

// Supabase Service Key en variable de entorno
SUPABASE_SERVICE_KEY=xxx (nunca en el cliente)

// Backups locales no son accesibles desde UI
// Solo desde endpoint protegido
```

---

## 📝 Checklist de implementación

- [ ] Crear tabla `backup_logs` (migración 002)
- [ ] Implementar `BackupService`
- [ ] Crear rutas `/admin/backup*`
- [ ] Implementar scheduler (cron)
- [ ] Crear componente `BackupManager`
- [ ] Agregar al Settings page
- [ ] Configurar Supabase Storage bucket
- [ ] Configurar `.env` con credenciales Supabase
- [ ] Testing: backup manual
- [ ] Testing: restauración local
- [ ] Testing: restauración Supabase
- [ ] Documentar proceso para usuario

---

**✅ Con esto tienes un sistema robusto de backup diario manual con Supabase como alternativa de seguridad**
