import * as crypto from 'node:crypto';
import { Environment } from '/opt/nodejs/config/env.js';
import { dynamodb } from '/opt/nodejs/data/dynamodb/db.js';
import { type AuthorizationCode, type UserConsent } from '/opt/nodejs/data/dynamodb/schema.js';

export const createAuthorizationCodeFromConsent = async (
  consent: UserConsent,
  redirectUri: string
): Promise<AuthorizationCode> => {
  if (!consent.approved) {
    throw new Error('Cannot create an authorization code from a consent that has not been approved');
  }
  const createdAtUTCMillis = Date.now();
  const expiresAtUTCMillis = createdAtUTCMillis + 10 * 60 * 1000; // 10 minutes
  const ttl = Math.floor(expiresAtUTCMillis / 1000); // DynamoDB TTL is in seconds
  let retries = 0;
  const maxRetries = 5;
  while (retries < maxRetries) {
    try {
      const item: AuthorizationCode = Object.fromEntries(
        Object.entries({
          code: crypto.randomBytes(32).toString('base64url'),
          clientId: consent.clientId,
          userId: consent.userId.trim().toLowerCase(),
          redirectUri: redirectUri.trim(),
          scope: consent.scope,
          codeChallenge: consent.codeChallenge ?? null,
          used: false,
          createdAtUTCMillis,
          expiresAtUTCMillis,
          ttl,
        } satisfies AuthorizationCode).filter(([, value]) => value !== null)
      ) as AuthorizationCode;
      await dynamodb.put({
        TableName: Environment.AUTHORIZATION_CODES_TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(code)',
      });
      return item;
    } catch {
      retries++;
    }
  }
  throw new Error(`Failed to create a unique authorization code after ${retries} attempts`);
};

export const authorizationCodeRedirectPath = (authorizationCode: AuthorizationCode, state: string | null): string => {
  const urlParams = new URLSearchParams({
    code: authorizationCode.code,
  });
  if (state !== null) {
    urlParams.append('state', state);
  }
  return `${authorizationCode.redirectUri}?${urlParams}`;
};
