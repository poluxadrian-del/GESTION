import { z } from 'zod';

export const seguimientoFormSchema = z.object({
  tipo_contacto: z.enum(['llamada', 'whatsapp', 'email']),
  resultado: z.enum(['contactado', 'no_contesto', 'promesa_pago', 'numero_incorrecto']),
  notas: z.string()
    .optional()
    .nullable(),
}).strict();

export type SeguimientoFormInput = z.infer<typeof seguimientoFormSchema>;
