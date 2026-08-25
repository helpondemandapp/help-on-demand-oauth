import { z } from 'zod';

export const Environment = z
  .object({
    AUTH_DOMAIN: z.string().nonempty(),
    OAUTH_CLIENTS_TABLE_NAME: z.string().nonempty(),
    CONSENT_REQUESTS_TABLE_NAME: z.string().nonempty(),
    BWS_WEB_BASE_URL: z.string().trim().toLowerCase().nonempty(),
    SESSIONS_TABLE_NAME: z.string().nonempty(),
  })
  .parse(process.env);

type EnvType = typeof Environment;

type EnvSuffix<Suffix extends string, ValueFilter = unknown> = keyof {
  [
    K in keyof EnvType as EnvType[K] extends ValueFilter ? (K extends `${string}_${Suffix}` ? K : never) : never
  ]: EnvType[K];
};

export type EnvironmentTableNameKeys = EnvSuffix<'TABLE_NAME', string>;
