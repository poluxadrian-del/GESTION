import { z } from 'zod';

export const clienteFormSchema = z.object({
  nombre_completo: z.string()
    .min(3, 'Nombre debe tener mínimo 3 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  telefono_celular: z.string().default('').optional().nullable(),
  email: z.string()
    .default('')
    .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido')
    .optional()
    .nullable(),
  ubicacion: z.string()
    .min(2, 'Ubicación requerida'),
  empresa: z.string()
    .default('')
    .optional()
    .nullable(),
  telefono_empresa: z.string()
    .default('')
    .optional()
    .nullable(),
  ref_nombre: z.string()
    .default('')
    .optional()
    .nullable(),
  ref_telefono: z.string()
    .default('')
    .optional()
    .nullable(),
  gestor_id: z.string()
    .uuid('Gestor inválido'),
  fecha_inicio: z.string()
    .refine(val => !isNaN(Date.parse(val)), 'Fecha inválida'),
  precio_venta: z.number()
    .positive('Precio debe ser mayor a 0')
    .max(999999.99, 'Precio muy alto'),
  frecuencia_pago: z.enum(['quincenal', 'mensual']),
  mensualidades: z.number()
    .int('Debe ser un número entero')
    .min(2, 'Mínimo 2 meses')
    .max(18, 'Máximo 18 meses'),
  dia_pago: z.number()
    .int('Debe ser un número entero')
    .min(1, 'Día mínimo 1')
    .max(31, 'Día máximo 31'),
  fecha_primer_pago: z.string()
    .default('')
    .optional()
    .nullable(),
  vendedor: z.string()
    .default('')
    .optional()
    .nullable(),
  factura: z.boolean().default(false),
  comision: z.boolean().default(false),
  notas: z.string()
    .default('')
    .optional()
    .nullable(),
});

// Schema para capturar dia_pago_2 solo en el formulario (no se almacena en BD)
export const clienteFormWithDiaPago2Schema = clienteFormSchema.extend({
  dia_pago_2: z.number()
    .int('Debe ser un número entero')
    .min(1, 'Día mínimo 1')
    .max(31, 'Día máximo 31')
    .optional()
    .nullable(),
});

export type ClienteFormInput = z.infer<typeof clienteFormSchema>;
export type ClienteFormWithDiaPago2 = z.infer<typeof clienteFormWithDiaPago2Schema>;
