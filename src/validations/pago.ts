import { z } from 'zod';

const hoy = new Date().toISOString().split('T')[0];

export const registrarPagoSchema = z.object({
  monto_pagado: z.number()
    .positive('Monto debe ser mayor a 0'),
  fecha_pago: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Fecha inválida')
    .refine(val => val <= hoy, 'La fecha de pago no puede ser en el futuro'),
  gestor_id: z.string()
    .uuid('Gestor requerido'),
  notas: z.string()
    .optional()
    .nullable(),
  motivo_cambio: z.string()
    .optional()
    .nullable(),
}).strict();

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

// Schema para editar pagos - requiere motivo obligatorio
export const editarPagoSchema = z.object({
  monto_pagado: z.number()
    .positive('Monto debe ser mayor a 0'),
  fecha_pago: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Fecha inválida')
    .refine(val => val <= hoy, 'La fecha de pago no puede ser en el futuro'),
  gestor_id: z.string()
    .uuid('Gestor requerido'),
  notas: z.string()
    .optional()
    .nullable(),
  motivo_cambio: z.string()
    .min(10, 'El motivo debe tener al menos 10 caracteres')
    .max(500, 'El motivo no puede exceder 500 caracteres'),
}).strict();

export type EditarPagoInput = z.infer<typeof editarPagoSchema>;
