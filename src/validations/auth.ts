import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .email('Email inválido'),
  password: z.string()
    .min(6, 'Contraseña debe tener mínimo 6 caracteres'),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;
