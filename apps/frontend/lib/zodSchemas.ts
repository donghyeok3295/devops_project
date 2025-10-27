import { z } from 'zod';

export const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['STORED','CLAIMED','HANDED_OVER']),
});
