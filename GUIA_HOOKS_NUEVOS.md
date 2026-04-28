# 🎉 HOOKS NUEVOS - Guía de Uso

## ✅ Lo que hemos creado

### 1. 🔧 Hooks Nuevos en `usePagos.ts`

5 funciones **ultra-simples** porque los triggers hacen todo:

```typescript
// 1. Obtener calendarios de pagos
const calendarios = await usePagos.obtenerCalendarioPagos(clienteId)

// 2. Obtener pagos realizados
const pagos = await usePagos.obtenerPagosRealizados(clienteId)

// 3. Registrar un nuevo pago (SIMPLE - 1 INSERT)
const pago = await usePagos.registrarPagoRealizado(clienteId, {
  fecha_pago: '2024-05-15',
  monto_pagado: 150,    // Cualquier monto
  gestor_id: 'ges-001',
  notas: 'Pago contado'
})

// 4. Editar un pago
const pagoEditado = await usePagos.editarPagoRealizado(pagoId, {
  monto_pagado: 200,
  notas: 'Pago rectificado'
})

// 5. Eliminar un pago
await usePagos.eliminarPagoRealizado(pagoId)

// 6. Obtener resumen consolidado
const resumen = await usePagos.obtenerResumenCliente(clienteId)
```

### 2. ✅ Validaciones en `pago-realizado.ts`

```typescript
import { 
  registrarPagoRealizadoSchema,
  editarPagoRealizadoSchema,
  validarRegistroPagoRealizado,
  validarEdicionPagoRealizado
} from '@/validations/pago-realizado'
```

---

## 💡 Ejemplos de Uso en Componentes

### Ejemplo 1: Registrar un Pago (Modal)

```typescript
// src/components/cobranza/ModalRegistrarPagoRealizado.tsx

import { usePagos } from '@/hooks/usePagos'
import { validarRegistroPagoRealizado } from '@/validations/pago-realizado'

export const ModalRegistrarPagoRealizado = ({ clienteId, onSuccess }) => {
  const { registrarPagoRealizado, loading } = usePagos()
  const [formData, setFormData] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto_pagado: 0,
    gestor_id: '',
    notas: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar
    const validacion = validarRegistroPagoRealizado(formData)
    if (validacion.error) {
      toast.error(validacion.error)
      return
    }

    // Registrar (los triggers hacen el resto)
    const resultado = await registrarPagoRealizado(clienteId, formData)
    
    if (resultado) {
      onSuccess() // Refrescar datos
      setFormData({ ...formData, monto_pagado: 0 })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        value={formData.fecha_pago}
        onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
      />
      <input
        type="number"
        placeholder="Monto pagado"
        value={formData.monto_pagado}
        onChange={(e) => setFormData({ ...formData, monto_pagado: parseFloat(e.target.value) })}
      />
      <select
        value={formData.gestor_id}
        onChange={(e) => setFormData({ ...formData, gestor_id: e.target.value })}
      >
        <option>Seleccionar gestor</option>
        {gestores.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
      </select>
      <textarea
        placeholder="Notas"
        value={formData.notas}
        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Registrando...' : 'Registrar Pago'}
      </button>
    </form>
  )
}
```

### Ejemplo 2: Ver Calendario de Pagos

```typescript
// src/components/clientes/CalendarioPagos.tsx

import { usePagos } from '@/hooks/usePagos'

export const CalendarioPagos = ({ clienteId }) => {
  const { obtenerCalendarioPagos, loading } = usePagos()
  const [calendarios, setCalendarios] = useState([])

  useEffect(() => {
    const cargar = async () => {
      const data = await obtenerCalendarioPagos(clienteId)
      setCalendarios(data)
    }
    cargar()
  }, [clienteId])

  if (loading) return <div>Cargando...</div>

  return (
    <table>
      <thead>
        <tr>
          <th>Cuota</th>
          <th>Fecha Programada</th>
          <th>Monto</th>
          <th>Saldo Pendiente</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {calendarios.map(cuota => (
          <tr key={cuota.id}>
            <td>{cuota.numero_cuota}</td>
            <td>{new Date(cuota.fecha_programada).toLocaleDateString()}</td>
            <td>${cuota.monto_programado.toFixed(2)}</td>
            <td>${cuota.saldo_pendiente.toFixed(2)}</td>
            <td>
              <span className={`badge badge-${cuota.estado}`}>
                {cuota.estado === 'pagado' && '✅ Pagado'}
                {cuota.estado === 'parcialmente_pagado' && '⚠️ Parcial'}
                {cuota.estado === 'pendiente' && '⏱️ Pendiente'}
              </span>
            </td>
            <td>
              <button onClick={() => abrirModalRegistrarPago(cuota)}>
                Registrar Pago
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Ejemplo 3: Resumen de Cliente (Dashboard)

```typescript
// src/components/dashboard/ResumenPagoCliente.tsx

import { usePagos } from '@/hooks/usePagos'

export const ResumenPagoCliente = ({ clienteId }) => {
  const { obtenerResumenCliente, loading } = usePagos()
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      const data = await obtenerResumenCliente(clienteId)
      setResumen(data)
    }
    cargar()
  }, [clienteId])

  if (loading || !resumen) return <div>Cargando...</div>

  return (
    <div className="resumen-pago">
      <h2>{resumen.nombre_completo}</h2>
      
      <div className="metricas">
        <div className="metrica">
          <label>Total Deuda</label>
          <value>${resumen.total_programado?.toFixed(2)}</value>
        </div>

        <div className="metrica">
          <label>Total Pagado</label>
          <value>${resumen.total_pagado_realizado?.toFixed(2)}</value>
        </div>

        <div className="metrica">
          <label>Saldo Pendiente</label>
          <value>${resumen.total_saldo_pendiente?.toFixed(2)}</value>
        </div>
      </div>

      <div className="cuotas">
        <p>Cuotas: {resumen.cuotas_pagadas} de {resumen.total_cuotas_programadas} pagadas</p>
        <progress value={resumen.cuotas_pagadas} max={resumen.total_cuotas_programadas} />
      </div>

      <div className="estado">
        <p>Estado: {resumen.cuotas_pendientes > 0 ? 'Deudor' : 'Liquidado'}</p>
      </div>
    </div>
  )
}
```

---

## ⚡ Comparación: Antes vs Después

### ANTES (Viejo usePagos con tabla pagos)
```typescript
// 5-6 queries por pago
const registrarPago = async (pagoId, clienteId, input) => {
  // 1. Obtener cliente
  const cliente = await supabase.from('clientes').select().eq('id', clienteId).single()
  
  // 2. Obtener pago actual
  const pago = await supabase.from('pagos').select().eq('id', pagoId).single()
  
  // 3. Determinar si es parcial
  const esParcial = input.monto_pagado < pago.monto_programado
  
  // 4. Si es parcial, crear nuevo pago
  if (esParcial) {
    await supabase.from('pagos').insert({...})
  }
  
  // 5. Actualizar pago actual
  await supabase.from('pagos').update({...}).eq('id', pagoId)
  
  // 6. Recalcular total_pagado
  const todosPagos = await supabase.from('pagos').select()
  const totalPagado = todosPagos.reduce((sum, p) => sum + p.monto_pagado, 0)
  
  // 7. Actualizar cliente
  await supabase.from('clientes').update({total_pagado: totalPagado}).eq('id', clienteId)
  
  // 8. Actualizar estado si es necesario
  if (saldo <= 0) {
    await supabase.from('clientes').update({estado: 'liquidado'})
  }
}
```

### AHORA (Nuevo usePagos con triggers)
```typescript
// 1 query - Los triggers hacen el resto
const registrarPagoRealizado = async (clienteId, input) => {
  return await supabase
    .from('pagos_realizados')
    .insert({
      cliente_id: clienteId,
      ...input
    })
    .select()
    .single()
  
  // ✅ Los triggers automáticamente:
  // - Actualizan clientes.total_pagado
  // - Actualizan calendarios_pagos.saldo_pendiente
  // - Cambian estado de cuota
}
```

**Reducción de complejidad: 60-70%** ✨

---

## 📋 Checklist de Implementación

- [x] Hooks creados (usePagos.ts)
- [x] Validaciones creadas (pago-realizado.ts)
- [ ] Actualizar CalendarioPagos.tsx
- [ ] Crear ModalRegistrarPagoRealizado.tsx
- [ ] Actualizar ResumenCobranza.tsx
- [ ] Actualizar PagosTable.tsx
- [ ] Testing manual
- [ ] Deploy

---

## 🚀 Próximo Paso

Actualizar los componentes para usar los nuevos hooks:

1. **CalendarioPagos.tsx** - Cambiar de `pagos` a `calendarios_pagos`
2. **ModalRegistrarPago.tsx** - Usar `registrarPagoRealizado()` (SIMPLE)
3. **ResumenCobranza.tsx** - Usar `obtenerResumenCliente()` (vista)
4. **PagosTable.tsx** - Mostrar `pagos_realizados`

¿Continuamos con los componentes?
