import { dynamodb, dynamoSchemaGet } from '/opt/nodejs/data/dynamodb/db.js';
import { type Client, ClientSchema } from '/opt/nodejs/data/dynamodb/schema.js';
import crypto from 'node:crypto';
import { Environment } from '/opt/nodejs/config/env.js';

export const getOauthClient = async (clientId: string): Promise<Client | null> => {
  return await dynamoSchemaGet({
    tableNameEnvVariable: 'OAUTH_CLIENTS_TABLE_NAME',
    schema: ClientSchema,
    key: { clientId: clientId.trim() },
  });
};

export const createClient = async (
  clientInsert: Pick<Client, 'clientType' | 'metadata' | 'redirectUris'>
): Promise<Client> => {
  const maxRetries = 5;
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const clientId = crypto.randomBytes(16).toString('base64url');
      const item = {
        clientId,
        metadata: clientInsert.metadata,
        redirectUris: clientInsert.redirectUris,
        defaultScopes: 'user:read:email',
        ...(clientInsert.clientType === 'public'
          ? {
              clientType: 'public' as const,
            }
          : {
              clientType: 'private' as const,
              clientSecret: crypto.randomBytes(32).toString('base64url'),
            }),
      } satisfies Client;
      await dynamodb.put({
        TableName: Environment.OAUTH_CLIENTS_TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(clientId)',
      });
      return item;
    } catch {
      retries++;
    }
  }
  throw new Error(`Failed to create a unique client ID after ${retries} attempts`);
};
