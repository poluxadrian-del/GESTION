# Guía de Prueba: Pagos Quincenales

## ✅ La solución NO requiere migración de BD

La solución captura el segundo día de quincena solo temporalmente en el formulario. No es necesario ejecutar migraciones.

## Paso 1: Crear un Cliente de Prueba con Pagos Quincenales

### Datos de prueba sugeridos:
```
Nombre: Cliente Test Quincenal
Ubicación: Calle 123
Gestor: (seleccionar uno)
Precio Venta: $600,000
Fecha Inicio: 01/04/2026
Frecuencia: Quincenal
Mensualidades: 6 (= 12 pagos quincenales)
Día 1ª Quincena: 1
Día 2ª Quincena: 16
```

### Resultado esperado:
El sistema debe generar 12 pagos (6 meses × 2 quincenas):
```
1. Pago: 01 de abril 2026
2. Pago: 16 de abril 2026
3. Pago: 01 de mayo 2026
4. Pago: 16 de mayo 2026
5. Pago: 01 de junio 2026
6. Pago: 16 de junio 2026
7. Pago: 01 de julio 2026
8. Pago: 16 de julio 2026
9. Pago: 01 de agosto 2026
10. Pago: 16 de agosto 2026
11. Pago: 01 de septiembre 2026
12. Pago: 16 de septiembre 2026
```

## Paso 2: Validar el Calendario

1. Crea el cliente desde el formulario
2. Ve a la sección de Calendario de Pagos
3. Verifica que:
   - Las fechas son consistentes (siempre 1 y 16)
   - Son exactamente 12 pagos
   - El monto de cada pago es $50,000 (600,000 / 12)

## Paso 3: Comparar con Patrón Diferente

Crea otro cliente con diferentes días para confirmar que funciona:
```
Día 1ª Quincena: 5
Día 2ª Quincena: 20
```

Resultado esperado:
```
1. Pago: 05 de abril 2026
2. Pago: 20 de abril 2026
3. Pago: 05 de mayo 2026
4. Pago: 20 de mayo 2026
...
```

## Paso 4: Validar Pagos Mensuales No Se Afecten

Crea un cliente mensual para confirmar que sigue funcionando:
```
Frecuencia: Mensual
Mensualidades: 6
Día Pago: 15
```

Resultado esperado:
```
1. Pago: 15 de abril 2026
2. Pago: 15 de mayo 2026
3. Pago: 15 de junio 2026
4. Pago: 15 de julio 2026
5. Pago: 15 de agosto 2026
6. Pago: 15 de septiembre 2026
```

## Paso 5: Verificar que NO se Guardó dia_pago_2

Busca un cliente quincenal creado y verifica en Supabase:
- La tabla `clientes` NO tiene columna `dia_pago_2` (no se alteró)
- Solo tiene `dia_pago` (que contiene el día de la 1ª quincena)
- El `dia_pago_2` se usó solo para generar el calendario

## Checklist de Validación
- [ ] Formulario muestra campos "Día 1ª Quincena" y "Día 2ª Quincena" para quincenales
- [ ] Formulario solo muestra "Día Pago" para mensuales
- [ ] Calendario de pagos quincenales es consistente mes a mes
- [ ] Calendario de pagos mensuales mantiene el mismo día cada mes
- [ ] Los montos por pago son correctos
- [ ] La BD NO fue alterada (verificar en Supabase)
- [ ] El sistema funciona con diferentes pares de días (1-16, 5-20, etc.)
