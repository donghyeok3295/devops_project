import { z } from 'zod';

export const EnvSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
});

export const env = EnvSchema.parse({
  NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
});
