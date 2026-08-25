import { z } from 'zod';

const BaseClientSchema = z.object({
  clientId: z.string().trim().nonempty(),
  redirectUris: z.array(z.string().trim().nonempty()).min(1, 'At least one redirect URI is required'),
  defaultScopes: z.string().trim().default('user:read:email'),
  metadata: z.looseObject({}).optional().default({}),
});

const PrivateClientSchema = BaseClientSchema.extend({
  clientType: z.literal('private'),
  clientSecret: z.string().trim().nonempty(),
});

const PublicClientSchema = BaseClientSchema.extend({
  clientType: z.literal('public'),
});

export const ClientSchema = z.discriminatedUnion('clientType', [PrivateClientSchema, PublicClientSchema]);

export const ConsentRequestSchema = z.object({
  requestId: z.string().trim().nonempty(),
  clientId: z.string().trim().nonempty(),
  redirectUri: z.string().trim().nonempty(),
  scope: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  codeChallenge: z.string().trim().nullable().optional(),
  createdAtUTCMillis: z.number().int().nonnegative(),
  expiresAtUTCMillis: z.number().int().nonnegative(),
  ttl: z.number().int().nonnegative(),
});
export type ConsentRequest = z.infer<typeof ConsentRequestSchema>;

export const UserSessionSchema = z.object({
  sessionId: z.string().trim().nonempty(),
  userId: z.string().trim().nonempty(),
  createdAtUTCMillis: z.number().int().nonnegative(),
  expiresAtUTCMillis: z.number().int().nonnegative(),
  ttl: z.number().int().nonnegative(),
});
export type UserSession = z.infer<typeof UserSessionSchema>;
