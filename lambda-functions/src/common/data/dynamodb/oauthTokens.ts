import * as crypto from 'node:crypto';
import { Environment } from '/opt/nodejs/config/env.js';
import { dynamodb } from '/opt/nodejs/data/dynamodb/db.js';
import { fetchSecret } from '/opt/nodejs/core/secrets.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { type AccessToken, type AuthorizationCode } from '/opt/nodejs/data/dynamodb/schema.js';

type CreateTokenSetParams = {
  clientId: string;
  userId: string;
  scope: string | null;
};

export type OAuthTokenSet = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
  refresh_token: string;
};

const WebAppAuthSecretSchema = z.object({
  jwt_audience: z.string().trim().nonempty(),
  jwt_secret: z.string().trim().nonempty(),
});

const ACCESS_TOKEN_TTL_SECONDS = 3600;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_ID_RETRIES = 5;

export const createOAuthTokenSet = async ({
  clientId,
  userId,
  scope,
}: CreateTokenSetParams): Promise<OAuthTokenSet> => {
  const now = Date.now();
  const { jwt_audience, jwt_secret } = await fetchSecret('web_app_auth', WebAppAuthSecretSchema);
  const subject = userId.trim().toLowerCase();
  const audience = jwt_audience.trim();
  const accessExpiresAtMillis = now + ACCESS_TOKEN_TTL_SECONDS * 1000;
  let accessToken = '';
  let accessTokenId: string;
  let accessRetries = 0;
  while (accessRetries < MAX_ID_RETRIES) {
    try {
      accessTokenId = crypto.randomBytes(32).toString('base64url');
      accessToken = jwt.sign(
        {
          sub: subject,
          aud: audience,
          client_id: clientId,
          ...(scope !== null ? { scope } : {}),
        },
        jwt_secret,
        {
          algorithm: 'HS256',
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
          jwtid: accessTokenId,
        }
      );
      const accessTokenItem: AccessToken = Object.fromEntries(
        Object.entries({
          accessTokenId,
          token: accessToken,
          clientId,
          userId: subject,
          audience,
          scope: scope ?? null,
          createdAtUTCMillis: now,
          expiresAtUTCMillis: accessExpiresAtMillis,
          ttl: Math.floor(accessExpiresAtMillis / 1000),
        } satisfies AccessToken).filter(([, value]) => value !== null)
      ) as AccessToken;
      await dynamodb.put({
        TableName: Environment.ACCESS_TOKENS_TABLE_NAME,
        Item: accessTokenItem,
        ConditionExpression: 'attribute_not_exists(accessTokenId)',
      });
      break;
    } catch {
      accessRetries++;
    }
  }
  if (accessRetries >= MAX_ID_RETRIES) {
    throw new Error(`Failed to create a unique access token ID after ${accessRetries} attempts`);
  }

  let refreshToken = '';
  const refreshExpiresAtMillis = now + REFRESH_TOKEN_TTL_SECONDS * 1000;
  let refreshRetries = 0;
  while (refreshRetries < MAX_ID_RETRIES) {
    try {
      refreshToken = crypto.randomBytes(32).toString('base64url');
      const refreshTokenItem: AuthorizationCode = Object.fromEntries(
        Object.entries({
          code: `rt_${refreshToken}`,
          clientId,
          userId: userId.trim().toLowerCase(),
          redirectUri: 'token',
          scope: scope ?? null,
          used: true,
          createdAtUTCMillis: now,
          expiresAtUTCMillis: refreshExpiresAtMillis,
          ttl: Math.floor(refreshExpiresAtMillis / 1000),
        } satisfies AuthorizationCode).filter(([, value]) => value !== null)
      ) as AuthorizationCode;
      await dynamodb.put({
        TableName: Environment.AUTHORIZATION_CODES_TABLE_NAME,
        Item: refreshTokenItem,
        ConditionExpression: 'attribute_not_exists(code)',
      });
      break;
    } catch {
      refreshRetries++;
    }
  }
  if (refreshRetries >= MAX_ID_RETRIES) {
    throw new Error(`Failed to create a unique refresh token after ${refreshRetries} attempts`);
  }

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    ...(scope !== null ? { scope } : {}),
    refresh_token: refreshToken,
  };
};
