import { z } from 'zod';

export type HODTokenRequest = {
  username: string;
  password: string;
  grant_type: 'password';
};

export const HODTokenResponseSchema = z.object({
  access_token: z.string().trim().nonempty(),
  token_type: z.string().trim().nonempty(),
  expires_in: z.number().int(),
});

export const HODInvalidLoginErrorSchema = z.object({
  error: z.string().trim().nonempty(),
  error_description: z.string().trim().nonempty(),
});

export const HODMeSchema = z.object({
  id: z.string().trim().nonempty(),
  email: z.string().trim().toLowerCase().nonempty(),
  hasExpiredPassword: z.boolean(),
});
export type HODMe = z.infer<typeof HODMeSchema>;
