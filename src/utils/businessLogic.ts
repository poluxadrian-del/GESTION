import type { FrecuenciaPago } from '@/types';

/**
 * Genera el calendario completo de pagos para un cliente
 * Utiliza fecha_primer_pago como inicio y suma periodos según la frecuencia:
 * - Mensual: suma 1 mes por cada cuota
 * - Quincenal: suma 15 días por cada cuota
 * 
 * Retorna la estructura para tabla calendarios_pagos (nueva arquitectura)
 */
export function generarCalendarioPagos(cliente: any): Array<{
  cliente_id: string;
  numero_cuota: number;
  fecha_programada: string;
  monto_programado: number;
  estado: 'pendiente';
  saldo_pendiente: number;
}> {
  const cuotas: Array<{
    cliente_id: string;
    numero_cuota: number;
    fecha_programada: string;
    monto_programado: number;
    estado: 'pendiente';
    saldo_pendiente: number;
  }> = [];
  
  // Iniciar siempre desde fecha_primer_pago
  const fechaInicio = new Date(cliente.fecha_primer_pago);

  for (let i = 1; i <= cliente.numero_pagos; i++) {
    let fechaProgramada: Date;

    if (cliente.frecuencia_pago === 'quincenal') {
      // Para quincenales: sumar 15 días por cada cuota
      fechaProgramada = new Date(fechaInicio);
      const diasAvanzados = (i - 1) * 15;
      fechaProgramada.setDate(fechaProgramada.getDate() + diasAvanzados);
    } else {
      // Para mensuales: sumar 1 mes por cada cuota
      fechaProgramada = new Date(fechaInicio);
      const mesesAvanzados = i - 1;
      fechaProgramada.setMonth(fechaProgramada.getMonth() + mesesAvanzados);
    }

    const montoProgramado = cliente.monto_pago;
    cuotas.push({
      cliente_id: cliente.id,
      numero_cuota: i,
      fecha_programada: fechaProgramada.toISOString().split('T')[0],
      monto_programado: montoProgramado,
      estado: 'pendiente',
      saldo_pendiente: montoProgramado,
    });
  }

  return cuotas;
}

/**
 * Calcula número de pagos según frecuencia y mensualidades
 */
export function calcularNumeroPagos(frecuencia: FrecuenciaPago, mensualidades: number): number {
  return frecuencia === 'quincenal' ? mensualidades * 2 : mensualidades;
}

/**
 * Calcula el monto de cada pago
 */
export function calcularMontoPago(precioVenta: number, descuento: number, numeroPagos: number): number {
  const saldo = precioVenta - descuento;
  return saldo / numeroPagos;
}

/**
 * Calcula el saldo actual después de un pago
 */
export function calcularSaldoPost(saldoActual: number, montoPagado: number): number {
  return Math.max(0, saldoActual - montoPagado);
}

/**
 * Determina si un cliente debe cambiar de estado a "liquidado"
 */
export function debeSerLiquidado(saldoPost: number): boolean {
  return saldoPost <= 0;
}
