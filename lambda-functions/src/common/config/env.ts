import { z } from 'zod';

export const Environment = z
  .object({
    AUTH_DOMAIN: z.string().nonempty(),
  })
  .parse(process.env);
