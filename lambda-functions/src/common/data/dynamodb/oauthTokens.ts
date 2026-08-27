import * as crypto from 'node:crypto';
import { Environment } from '/opt/nodejs/config/env.js';
import { dynamodb } from '/opt/nodejs/data/dynamodb/db.js';
import { fetchSecret } from '/opt/nodejs/core/secrets.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

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

export const createOAuthTokenSet = async ({
  clientId,
  userId,
  scope,
}: CreateTokenSetParams): Promise<OAuthTokenSet> => {
  const now = Date.now();
  const { jwt_audience, jwt_secret } = await fetchSecret('web_app_auth', WebAppAuthSecretSchema);
  const subject = userId.trim().toLowerCase();
  const audience = jwt_audience.trim();
  const jti = crypto.randomBytes(32).toString('base64url');
  const accessToken = jwt.sign(
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
      jwtid: jti,
    }
  );

  const accessExpiresAtMillis = now + ACCESS_TOKEN_TTL_SECONDS * 1000;
  await dynamodb.put({
    TableName: Environment.ACCESS_TOKENS_TABLE_NAME,
    Item: {
      accessTokenId: jti,
      token: accessToken,
      clientId,
      userId: subject,
      audience,
      scope: scope ?? null,
      createdAtUTCMillis: now,
      expiresAtUTCMillis: accessExpiresAtMillis,
      ttl: Math.floor(accessExpiresAtMillis / 1000),
    },
    ConditionExpression: 'attribute_not_exists(accessTokenId)',
  });

  const refreshToken = crypto.randomBytes(32).toString('base64url');
  const refreshExpiresAtMillis = now + REFRESH_TOKEN_TTL_SECONDS * 1000;
  await dynamodb.put({
    TableName: Environment.AUTHORIZATION_CODES_TABLE_NAME,
    Item: {
      code: `rt_${refreshToken}`,
      clientId,
      userId: userId.trim().toLowerCase(),
      redirectUri: 'token',
      scope: scope ?? null,
      used: true,
      createdAtUTCMillis: now,
      expiresAtUTCMillis: refreshExpiresAtMillis,
      ttl: Math.floor(refreshExpiresAtMillis / 1000),
    },
    ConditionExpression: 'attribute_not_exists(code)',
  });

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    ...(scope !== null ? { scope } : {}),
    refresh_token: refreshToken,
  };
};
