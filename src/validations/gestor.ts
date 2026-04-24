import { z } from 'zod';

export const gestorFormSchema = z.object({
  nombre: z.string()
    .min(3, 'Nombre debe tener mínimo 3 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
}).strict();

export type GestorFormInput = z.infer<typeof gestorFormSchema>;
