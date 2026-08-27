import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import { getOauthClient } from '/opt/nodejs/data/dynamodb/clients.js';
import { findAuthorizationCode, markAuthorizationCodeAsUsed } from '/opt/nodejs/data/dynamodb/authorizationCodes.js';
import { createOAuthTokenSet } from '/opt/nodejs/data/dynamodb/oauthTokens.js';
import { normalizeScopeString } from '/opt/nodejs/core/scopes.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';

const BaseRequestSchema = z.object({
  client_id: z.string().trim().nonempty('client_id is required'),
  client_secret: z.string().trim().optional(),
});

const CodeSchema = BaseRequestSchema.extend({
  grant_type: z.literal('authorization_code'),
  code: z.string().trim().nonempty('code is required'),
  redirect_uri: z.string().trim().nonempty('redirect_uri is required'),
  code_verifier: z.string().trim().optional(),
});

const RefreshTokenSchema = BaseRequestSchema.extend({
  grant_type: z.literal('refresh_token'),
  refresh_token: z.string().trim().nonempty('refresh_token is required'),
});

const RequestSchema = z.discriminatedUnion('grant_type', [CodeSchema, RefreshTokenSchema]);

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();
    const bodyParams = new URLSearchParams(event.body ?? '');
    const safeBody = RequestSchema.safeParse({
      grant_type: bodyParams.get('grant_type') ?? undefined,
      code: bodyParams.get('code') ?? undefined,
      redirect_uri: bodyParams.get('redirect_uri') ?? undefined,
      client_id: bodyParams.get('client_id') ?? undefined,
      client_secret: bodyParams.get('client_secret') ?? undefined,
      code_verifier: bodyParams.get('code_verifier') ?? undefined,
      refresh_token: bodyParams.get('refresh_token') ?? undefined,
    });
    if (!safeBody.success) {
      return res.status(400).json({ error: JSON.parse(safeBody.error.message) });
    }

    const request = safeBody.data;
    const client = await getOauthClient(request.client_id);
    if (client === null) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const requestSecret = request.client_secret ?? null;

    if (client.clientType !== 'public') {
      if (requestSecret === null || requestSecret.length === 0) {
        return res.status(401).json({ error: 'invalid_client' });
      }
      if (client.clientSecret !== requestSecret) {
        return res.status(401).json({ error: 'invalid_client' });
      }
    }

    setContext('grantType', request.grant_type);
    setContext('clientId', client.clientId);
    if (request.grant_type === 'authorization_code') {
      const authorizationCode = await findAuthorizationCode(request.code);
      if (authorizationCode === null) {
        setContext('invalidGrantReason', 'code_not_found');
        return res.status(400).json({ error: 'invalid_grant' });
      }
      if (authorizationCode.used) {
        setContext('invalidGrantReason', 'code_already_used');
        return res.status(400).json({ error: 'invalid_grant' });
      }
      if (authorizationCode.clientId !== client.clientId) {
        setContext('invalidGrantReason', 'client_id_mismatch');
        return res.status(400).json({ error: 'invalid_grant' });
      }
      if (authorizationCode.redirectUri !== request.redirect_uri) {
        setContext('invalidGrantReason', 'redirect_uri_mismatch');
        return res.status(400).json({ error: 'invalid_grant' });
      }

      const codeChallenge = authorizationCode.codeChallenge ?? null;
      const codeVerifier = request.code_verifier ?? null;

      if (codeChallenge !== null) {
        if (codeVerifier === null) {
          setContext('invalidGrantReason', 'code_verifier_missing');
          return res.status(400).json({ error: 'invalid_grant' });
        }
        const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        if (challenge !== codeChallenge) {
          setContext('invalidGrantReason', 'code_verifier_mismatch');
          return res.status(400).json({ error: 'invalid_grant' });
        }
      }

      await markAuthorizationCodeAsUsed(authorizationCode.code);
      const tokenSet = await createOAuthTokenSet({
        clientId: authorizationCode.clientId,
        userId: authorizationCode.userId,
        scope: authorizationCode.scope ? normalizeScopeString(authorizationCode.scope) : null,
      });
      return res.status(200).json(tokenSet);
    }

    const refreshTokenRecord = await findAuthorizationCode(`rt_${request.refresh_token}`);
    if (refreshTokenRecord === null) {
      setContext('invalidGrantReason', 'refresh_token_not_found');
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (refreshTokenRecord.clientId !== client.clientId) {
      setContext('invalidGrantReason', 'client_id_mismatch');
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (refreshTokenRecord.redirectUri !== 'token') {
      setContext('invalidGrantReason', 'redirect_uri_mismatch');
      return res.status(400).json({ error: 'invalid_grant' });
    }

    const tokenSet = await createOAuthTokenSet({
      clientId: refreshTokenRecord.clientId,
      userId: refreshTokenRecord.userId,
      scope: refreshTokenRecord.scope ? normalizeScopeString(refreshTokenRecord.scope) : null,
    });
    return res.status(200).json(tokenSet);
  },
});
