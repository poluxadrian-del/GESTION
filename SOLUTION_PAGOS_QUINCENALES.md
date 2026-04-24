# Solución: Pagos Quincenales con Fechas Consistentes

## Problema Identificado
Los pagos quincenales tenían fechas inconsistentes cada mes porque el sistema sumaba exactamente 15 días a cada fecha, causando que se desplazaran en lugar de mantener dos fechas fijas dentro del mes.

**Ejemplo del problema:**
- Pago 1: 15 de enero
- Pago 2: 30 de enero  
- Pago 3: 14 de febrero (15+15=30, -30 días de enero ≈ 14)
- Pago 4: 1 de marzo

## Solución Implementada (SIN alterar la BD)

### 1. Formulario - Captura Temporal (ClienteForm.tsx)
El formulario captura el día de la segunda quincena **solo para generar el calendario**, pero **NO lo almacena en la BD**:
- Para **pagos mensuales**: Solo muestra "Día Pago"
- Para **pagos quincenales**: Muestra "Día 1ª Quincena" y "Día 2ª Quincena"

El campo `dia_pago_2` se pasa temporalmente bajo la propiedad `_diaPago2Temporal` al hook de creación.

### 2. Lógica de Negocio (businessLogic.ts)
Se rediseñó la función `generarCalendarioPagos` para:
- **Pagos quincenales**: Alterna entre `dia_pago` y `dia_pago_2` cada mes
- **Pagos mensuales**: Mantiene el mismo `dia_pago` cada mes
- Incluye función auxiliar `calcularDiaPago2()` que calcula automáticamente si no se proporciona

**Ejemplo del resultado correcto:**
```
Configuración: dia_pago=1, dia_pago_2=16, frecuencia=quincenal
- Pago 1: 1 de enero
- Pago 2: 16 de enero
- Pago 3: 1 de febrero
- Pago 4: 16 de febrero
- ...mantiene el patrón perfectamente
```

### 3. Validaciones (cliente.ts)
- `dia_pago` siempre se valida normalmente
- `dia_pago_2` se captura en el formulario pero no se incluye en la BD
- No hay cambios en la estructura de validaciones de BD

## Ventajas de esta Solución
✅ **No requiere migración BD**
✅ **Sin cambios en el modelo de datos**
✅ **Simple y práctica**
✅ **Mantenible a futuro**
✅ **El calendario se genera perfectamente**

## Archivos Modificados
1. `/src/utils/businessLogic.ts` - Nueva lógica de generación + función auxiliar
2. `/src/components/clientes/ClienteForm.tsx` - Formulario actualizado (captura dia_pago_2)
3. `/src/validations/cliente.ts` - Validaciones actualizadas (sin cambios BD)

## Cómo Funciona
1. Usuario llena el formulario con ambos días (1ª y 2ª quincena)
2. Al enviar, `dia_pago_2` se pasa temporalmente como `_diaPago2Temporal`
3. Función `generarCalendarioPagos()` usa ambos valores
4. En BD solo se almacena el cliente con `dia_pago` (no se guarda `dia_pago_2`)
5. Cada vez que se regenere el calendario, usa los mismos valores de `dia_pago` y calcula automáticamente si es necesario

