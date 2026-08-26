import { dynamoSchemaGet } from '/opt/nodejs/data/dynamodb/db.js';
import { type Client, ClientSchema } from '/opt/nodejs/data/dynamodb/schema.js';

export const getOauthClient = async (clientId: string): Promise<Client | null> => {
  return await dynamoSchemaGet({
    tableNameEnvVariable: 'OAUTH_CLIENTS_TABLE_NAME',
    schema: ClientSchema,
    key: { clientId: clientId.trim() },
  });
};
