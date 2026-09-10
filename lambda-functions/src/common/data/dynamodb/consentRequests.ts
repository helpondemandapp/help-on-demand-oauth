import * as crypto from 'node:crypto';
import { type ConsentRequest, ConsentRequestSchema } from '/opt/nodejs/data/dynamodb/schema.js';
import { dynamodb, dynamoSchemaGet } from '/opt/nodejs/data/dynamodb/db.js';
import { Environment } from '/opt/nodejs/config/env.js';

type GeneratedConsentKeys = 'requestId' | 'createdAtUTCMillis' | 'expiresAtUTCMillis' | 'ttl';

export const createNewConsentRequest = async (
  consentRequest: Omit<ConsentRequest, GeneratedConsentKeys>
): Promise<ConsentRequest> => {
  const createdAtUTCMillis = Date.now();
  const expiresAtUTCMillis = createdAtUTCMillis + 10 * 60 * 1000; // 10 minutes
  const ttl = Math.floor(expiresAtUTCMillis / 1000); // DynamoDB TTL is in seconds
  let retries = 0;
  const maxRetries = 5;
  while (retries < maxRetries) {
    try {
      const item: ConsentRequest = Object.fromEntries(
        Object.entries({
          requestId: crypto.randomBytes(16).toString('base64url'),
          createdAtUTCMillis,
          expiresAtUTCMillis,
          ttl,
          ...consentRequest,
        }).filter(([, value]) => value !== null)
      ) as ConsentRequest;
      await dynamodb.put({
        TableName: Environment.CONSENT_REQUESTS_TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(requestId)',
      });
      return item;
    } catch {
      retries++;
    }
  }
  throw new Error(`Failed to create a unique consent request after ${retries} attempts`);
};

export const getConsentRequest = async (requestId: string): Promise<ConsentRequest | null> => {
  const now = Date.now();
  const item = await dynamoSchemaGet({
    tableNameEnvVariable: 'CONSENT_REQUESTS_TABLE_NAME',
    key: { requestId: requestId },
    schema: ConsentRequestSchema,
  });
  if (item === null) return null;
  if (item.expiresAtUTCMillis < now) return null;
  return item;
};
