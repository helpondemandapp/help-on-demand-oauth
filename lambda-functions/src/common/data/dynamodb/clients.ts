import { dynamoSchemaGet } from '/opt/nodejs/data/dynamodb/db.js';
import { ClientSchema } from '/opt/nodejs/data/dynamodb/schema.js';

export const getOauthClient = async (clientId: string) => {
  return await dynamoSchemaGet({
    tableNameEnvVariable: 'OAUTH_CLIENTS_TABLE_NAME',
    schema: ClientSchema,
    key: { clientId: clientId.trim() },
  });
};
