import { z } from 'zod';

export const Environment = z.object({}).parse(process.env);
