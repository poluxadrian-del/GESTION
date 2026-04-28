import { z } from 'zod';

/**
 * Validaciones para tablas nuevas:
 * - calendarios_pagos (plan de cobro)
 * - pagos_realizados (registro de pagos)
 */

// ============ CALENDARIO DE PAGOS ============

export const crearCalendarioPagoSchema = z.object({
  cliente_id: z.string().uuid('Cliente ID inválido'),
  numero_cuota: z.number().min(1, 'Número de cuota debe ser >= 1'),
  fecha_programada: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Fecha programada inválida',
  }),
  monto_programado: z.number().positive('Monto debe ser mayor a 0'),
  estado: z.enum(['pendiente', 'parcialmente_pagado', 'pagado']).default('pendiente'),
  saldo_pendiente: z.number().nonnegative('Saldo no puede ser negativo'),
  notas: z.string().optional(),
});

export type CrearCalendarioPagoInput = z.infer<typeof crearCalendarioPagoSchema>;

// ============ PAGOS REALIZADOS ============

export const registrarPagoRealizadoSchema = z.object({
  fecha_pago: z.string().refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d <= new Date();
  }, {
    message: 'Fecha de pago debe ser válida y no futura',
  }),
  monto_pagado: z.number().positive('Monto debe ser mayor a 0'),
  gestor_id: z.string().uuid('Gestor ID inválido'),
  notas: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional(),
});

export type RegistrarPagoRealizadoInput = z.infer<typeof registrarPagoRealizadoSchema>;

export const editarPagoRealizadoSchema = z.object({
  fecha_pago: z.string().refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime()) && d <= new Date();
  }, {
    message: 'Fecha de pago debe ser válida y no futura',
  }).optional(),
  monto_pagado: z.number().positive('Monto debe ser mayor a 0').optional(),
  notas: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional(),
});

export type EditarPagoRealizadoInput = z.infer<typeof editarPagoRealizadoSchema>;

// ============ VALIDADORES ============

export const validarRegistroPagoRealizado = (input: unknown) => {
  try {
    return registrarPagoRealizadoSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: 'Error al validar pago' };
  }
};

export const validarEdicionPagoRealizado = (input: unknown) => {
  try {
    return editarPagoRealizadoSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: 'Error al validar pago' };
  }
};
