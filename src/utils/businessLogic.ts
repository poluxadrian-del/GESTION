/**
 * Helpers para lógica de negocio crítica
 */

import type { FrecuenciaPago } from '@/types';

/**
 * Genera el calendario completo de pagos para un cliente
 * Para pagos quincenales, alterna entre dia_pago y dia_pago_2
 * dia_pago_2 es temporal (solo para generar calendario, no se almacena en BD)
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
  const cuotas = [];
  const fechaInicio = new Date(cliente.fecha_primer_pago);
  const añoInicio = fechaInicio.getFullYear();
  const mesInicio = fechaInicio.getMonth();

  for (let i = 1; i <= cliente.numero_pagos; i++) {
    let fechaProgramada: Date;

    if (cliente.frecuencia_pago === 'quincenal') {
      // Para quincenales: calcular qué quincena le toca (0=primera, 1=segunda)
      const indiceQuincena = (i - 1) % 2;
      // Calcular en qué mes cae este pago (cada 2 pagos = 1 mes)
      const mesesAvanzados = Math.floor((i - 1) / 2);
      const año = añoInicio + Math.floor((mesInicio + mesesAvanzados) / 12);
      const mes = (mesInicio + mesesAvanzados) % 12;

      // Usar dia_pago_2 si está disponible (temporal del formulario), si no calcular automáticamente
      const diaPago2 = cliente._diaPago2Temporal;
      const diaTarget = indiceQuincena === 0 ? cliente.dia_pago : (diaPago2 || calcularDiaPago2(cliente.dia_pago));
      
      fechaProgramada = new Date(año, mes, diaTarget);
    } else {
      // Para mensuales: mismo día cada mes
      const mesesAvanzados = i - 1;
      const año = añoInicio + Math.floor((mesInicio + mesesAvanzados) / 12);
      const mes = (mesInicio + mesesAvanzados) % 12;
      fechaProgramada = new Date(año, mes, cliente.dia_pago);
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
 * Calcula automáticamente el día de la segunda quincena basado en el día de la primera
 * Ejemplos:
 * - dia_pago=1 -> retorna 16
 * - dia_pago=5 -> retorna 20
 * - dia_pago=15 -> retorna 30
 */
function calcularDiaPago2(diaPago: number): number {
  return Math.min(diaPago + 15, 31);
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
