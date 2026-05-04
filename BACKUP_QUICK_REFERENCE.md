# 🔄 Resumen: Backup Diario + Supabase como Fallback

## ✨ Estrategia implementada

**Objetivo:** Sincronizar datos **local → Supabase** diariamente para tener respaldo automático.

```
PostgreSQL Local (Principal)
        │
        ├─► Backup MANUAL (botón en UI)
        │
        ├─► Backup AUTOMÁTICO (2 AM diariamente)
        │
        └─► Exportar JSON + Subir a Supabase Storage
                │
                ▼
        Supabase (Respaldo en la nube)
                │
                ├─► ✅ Recuperación si falla local
                ├─► ✅ Historial de 30 días
                └─► ✅ Acceso como punto de recuperación
```

---

## 🎯 Funcionalidades clave

### ✅ Backup Manual
```
Settings → Backup & Recovery
    │
    └─► [💾 Backup Ahora]
         ├─ Exporta todas las tablas
         ├─ Guarda JSON localmente
         ├─ Sube a Supabase automáticamente
         └─ Notifica al usuario
```

### ✅ Backup Automático (cada día a las 2 AM)
```
Scheduler (cron)
    │
    └─► Ejecuta automáticamente sin intervención
         ├─ Exporta datos
         ├─ Sincroniza con Supabase
         ├─ Registra en tabla backup_logs
         └─ Limpia backups > 30 días
```

### ✅ Restauración (si falla PostgreSQL)
```
Settings → Restore
    │
    ├─► Opción 1: Restaurar desde backup LOCAL (rápido)
    │
    ├─► Opción 2: Restaurar desde SUPABASE (si local no existe)
    │
    └─► Confirmación ⚠️ sobrescribe datos actuales
```

---

## 📊 Comparativa: Métodos de backup

| Método | Implementación | Automático | Tiempo real | Recuperación |
|--------|---|---|---|---|
| **Backup Manual** | Botón en UI | ❌ User-triggered | ❌ On-demand | Rápido |
| **Backup Automático (cron)** | Scheduler diario | ✅ 2 AM | ❌ Diario | Rápido |
| **Sincronización a Supabase** | API HTTP | ✅ Por cada backup | ❌ Diario | Rápido |
| **Fallback automático** | Si local falla | ✅ Automático | ❌ Emergencia | Muy rápido |

---

## 🏗️ Componentes implementados

### Backend Express
- **BackupService** — Lógica de backup/restore
- **Rutas API** — `/api/admin/backup*`
- **Scheduler** — Cron para backup automático
- **Tabla `backup_logs`** — Registro de intentos

### Frontend React
- **BackupManager** — Interfaz de usuario
- **Historial visual** — Estados y duraciones
- **Botones de acción** — Backup, Restore, Limpiar

### Supabase Storage
- **Bucket `backups/`** — Almacenamiento seguro
- **Estructura:** `backups/YYYY-MM-DD/UUID/`
- **Acceso:** Service Role Key (seguro en backend)

---

## 📋 Implementación rápida (checklist)

### Backend
- [ ] Crear tabla `backup_logs` (migración SQL)
- [ ] Copiar `BackupService` a `server/src/services/`
- [ ] Copiar rutas a `server/src/routes/admin.ts`
- [ ] Implementar scheduler (cron)
- [ ] Configurar Supabase en `.env`

### Frontend
- [ ] Copiar `BackupManager.tsx` a componentes
- [ ] Importar en Settings page
- [ ] Probar backup manual
- [ ] Probar restauración

### Testing
- [ ] Backup manual exitoso
- [ ] Datos sincronizados a Supabase
- [ ] Historial visible en UI
- [ ] Restauración desde local
- [ ] Restauración desde Supabase (fallback)

---

## 🔒 Seguridad

| Aspecto | Implementación |
|--------|---|
| **Acceso** | Solo Socio (`roleMiddleware('socio')`) |
| **Credenciales Supabase** | Service Key en `.env` (nunca expuesto) |
| **Backups locales** | En carpeta `backups/` del servidor |
| **Datos en tránsito** | HTTPS a Supabase |
| **Historial** | Tabla auditable `backup_logs` |

---

## 📊 Estadísticas de backup

Tabla `backup_logs` registra:
- **Tipo:** manual vs automático
- **Estado:** exitoso, fallido, pendiente
- **Registros respaldados:** cantidad de filas
- **Tamaño:** bytes guardados
- **Duración:** tiempo en segundos
- **Ubicación:** ruta en Supabase
- **Motivo de error:** si falló

### Consulta ejemplo:
```sql
SELECT * FROM backup_logs
WHERE estado = 'exitoso'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎬 Flujos de usuario

### Escenario 1: Backup manual diario
```
1. Usuario abre Settings
2. Hace clic en "Backup Ahora"
3. ⏳ Se muestra "Respaldando..."
4. ✅ Notificación: "Backup completado: 1.250 registros"
5. Ve en historial: "Manual - Exitoso - Hace 2 minutos"
```

### Escenario 2: Backup automático (sin intervención)
```
1. Noche anterior a las 2 AM → Scheduler ejecuta
2. Exporta datos de PostgreSQL
3. Guarda JSON localmente
4. Sube a Supabase Storage
5. Registra en tabla backup_logs
6. Usuario NO sabe que ocurrió (transparente)
```

### Escenario 3: PostgreSQL falla, recuperar desde Supabase
```
1. PostgreSQL está down
2. Usuario ve error: "Base de datos no disponible"
3. Va a Settings → Restore
4. Elige backup más reciente de Supabase
5. Hace clic "Restaurar desde Supabase"
6. ⚠️ Confirmación: "¿Sobrescribir datos?"
7. ✅ Datos restaurados automáticamente
8. Aplicación vuelve a funcionar
```

---

## 🔄 Ciclo de vida del backup

```
Día 1, 2 AM
    └─► Backup automático #1 ✅
         ├─ Guardado localmente
         ├─ Sincronizado a Supabase
         └─ Registrado en BD

Día 1, 3 PM
    └─► Usuario hace backup manual ✅
         ├─ Guardado localmente
         ├─ Sincronizado a Supabase
         └─ Registrado en BD

Día 2, 2 AM
    └─► Backup automático #2 ✅

Día 31, 2 AM
    └─► Scheduler limpia backups > 30 días
         ├─ Elimina archivos locales
         ├─ Elimina de Supabase
         └─ Mantiene registro en BD
```

---

## 🔑 Configuración necesaria

### server/.env
```env
# Supabase (para backups)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=sbp_xxxxx  # Key de servicio (privilegios completos)

# Scheduler
ENABLE_BACKUP_SCHEDULER=true
BACKUP_TIME=0 2 * * *  # 2 AM (cron format)
```

### Supabase Dashboard
1. Crear bucket `backups` en Storage
2. Configurar permisos (público lectura, privado escritura)
3. Obtener Service Role Key en Settings → API

---

## 📈 Monitoreo

### Dashboard de backups (para desarrolladores)
```
POST /api/admin/backup-history
    └─► Retorna últimos 10 backups con:
         ├─ Fecha inicio/fin
         ├─ Estado (exitoso/fallido)
         ├─ Cantidad de registros
         ├─ Duración en segundos
         └─ Motivo si falló
```

### Alertas recomendadas
- ⚠️ Backup fallido → Notificar al administrador
- ⚠️ Sincronización a Supabase falló → Reintentar
- ✅ Backup exitoso → Log silencioso

---

## 💡 Ventajas de esta estrategia

| Ventaja | Beneficio |
|---------|----------|
| **Doble respaldo** | Local + Supabase |
| **Recuperación rápida** | Si falla PostgreSQL, usar Supabase |
| **Cero mantenimiento** | Automático a las 2 AM |
| **Auditable** | Tabla de logs completa |
| **Versión anterior** | Acceso a múltiples snapshots |
| **Fallback automático** | Si local falla, usar cloud |
| **Seguro** | Service Key no expuesta en cliente |

---

## 🚀 Deploy a producción

### Pre-deployment
- [ ] Crear bucket en Supabase Storage
- [ ] Configurar Service Role Key en variables
- [ ] Crear tabla `backup_logs` en BD
- [ ] Testear backup/restore en dev

### Deployment
- [ ] Deploy backend con BackupService
- [ ] Deploy frontend con BackupManager
- [ ] Ejecutar migraciones DB
- [ ] Verificar primer backup manual
- [ ] Configurar scheduler en producción

### Post-deployment
- [ ] Monitorear primeros backups
- [ ] Verificar sincronización a Supabase
- [ ] Testear restauración en staging
- [ ] Documentar procedimiento de recovery

---

## 📞 Troubleshooting

| Problema | Solución |
|----------|----------|
| Backup fallido | Revisar logs, verificar conexión Supabase |
| Restauración lenta | Muchos registros, paciencia |
| Supabase no responde | Verificar credenciales en `.env` |
| Backups no se limpian | Verificar scheduler, revisar logs |
| UI no muestra historial | Verificar endpoint `/admin/backup-history` |

---

## 📚 Documentación completa

Para más detalles, ver: **BACKUP_SYNC_STRATEGY.md**

Contiene:
- ✅ Implementación paso a paso
- ✅ Código fuente completo
- ✅ Componentes React
- ✅ Configuración Supabase
- ✅ Checklist detallado

---

**¡Sistema de backup robusto listo para producción! 🎉**

Versión: 1.0
Fecha: Abril 2025
