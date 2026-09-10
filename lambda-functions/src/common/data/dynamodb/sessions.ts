import { type UserSession, UserSessionSchema } from '/opt/nodejs/data/dynamodb/schema.js';
import * as crypto from 'node:crypto';
import { dynamodb, dynamoSchemaGet } from '/opt/nodejs/data/dynamodb/db.js';
import { Environment } from '/opt/nodejs/config/env.js';

export const createNewSession = async (userId: string): Promise<UserSession> => {
  const createdAtUTCMillis = Date.now();
  const expiresAtUTCMillis = createdAtUTCMillis + 30 * 60 * 1000; // 30 minutes
  const ttl = Math.floor(expiresAtUTCMillis / 1000);
  let retries = 0;
  const maxRetries = 5;
  while (retries < maxRetries) {
    const item: UserSession = {
      sessionId: crypto.randomBytes(32).toString('base64url'),
      userId,
      createdAtUTCMillis,
      expiresAtUTCMillis,
      ttl,
    };
    try {
      await dynamodb.put({
        TableName: Environment.SESSIONS_TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(sessionId)',
      });
      return item;
    } catch {
      retries++;
    }
  }
  throw new Error(`Failed to create a unique session after ${retries} attempts`);
};

export const findSessionById = async (sessionId: string): Promise<UserSession | null> => {
  const now = Date.now();
  const session = await dynamoSchemaGet({
    tableNameEnvVariable: 'SESSIONS_TABLE_NAME',
    schema: UserSessionSchema,
    key: { sessionId: sessionId.trim() },
  });
  if (session === null) return null;
  if (session.expiresAtUTCMillis < now) return null;
  return session;
};
