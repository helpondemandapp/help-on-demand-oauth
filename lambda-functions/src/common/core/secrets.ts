import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { z } from 'zod';

export const DbConnectionStringsSchema = z.object({
  lrq_username: z.string(),
  lrq_password: z.string(),
  lrq_server: z.string(),
});

const CACHE_TTL = 5 * 60000; // 5 minutes
const secretMemoryCache = new Map<string, { secretValue: string; dateAdded: number }>();

const getFromCache = (secretId: string) => {
  const cacheValue = secretMemoryCache.get(secretId) ?? null;
  if (cacheValue === null) return null;
  const now = new Date().valueOf();
  if (now - cacheValue.dateAdded > CACHE_TTL) return null;
  return cacheValue.secretValue;
};

const setToCache = (secretId: string, value: string) => {
  secretMemoryCache.set(secretId, { secretValue: value, dateAdded: new Date().valueOf() });
};

export const fetchSecretString = async (secretId: string) => {
  const fromCache = getFromCache(secretId);
  if (fromCache !== null) return fromCache;
  const secrets = new SecretsManagerClient();
  try {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
    const secretValue = result.SecretString ?? '';
    setToCache(secretId, secretValue);
    return secretValue;
  } finally {
    secrets.destroy();
  }
};

export const fetchSecret = async <T extends z.ZodType>(secretId: string, schema: T): Promise<z.infer<T>> => {
  return schema.parse(JSON.parse(await fetchSecretString(secretId)));
};
