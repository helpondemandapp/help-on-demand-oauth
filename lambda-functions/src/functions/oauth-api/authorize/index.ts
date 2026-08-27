import { apiRequestLambdaWrapper, parseCookieHeader, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import { createNewConsentRequest } from '/opt/nodejs/data/dynamodb/consentRequests.js';
import { getOauthClient } from '/opt/nodejs/data/dynamodb/clients.js';
import { findSessionById } from '/opt/nodejs/data/dynamodb/sessions.js';
import { findUserConsent } from '/opt/nodejs/data/dynamodb/consents.js';
import { authorizationCodeRedirectPath, createAuthorizationCodeFromConsent } from '/opt/nodejs/data/dynamodb/authorizationCodes.js';
import { normalizeScopeString, validateClientScopes, validateUserScopes } from '/opt/nodejs/core/scopes.js';
import { openSql } from '/opt/nodejs/data/sql/db.js';
import { fetchUserWithRoles } from '/opt/nodejs/data/sql/users.js';
import type { Client } from '/opt/nodejs/data/dynamodb/schema.js';

const QueryParametersSchema = z.object({
  client_id: z.string().nonempty('client_id is required'),
  redirect_uri: z.string().trim().nonempty('redirect_uri must be a valid URL'),
  response_type: z.enum(['code'], 'response_type must be "code"'),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['plain', 'S256']).optional(),
});

async function createConsentRequest(
  client: Client,
  params: z.infer<typeof QueryParametersSchema>,
  codeChallenge: string | null,
  path: 'login' | 'consent',
  res: ResponseBuilder
) {
  const request = await createNewConsentRequest({
    clientId: client.clientId,
    redirectUri: params.redirect_uri,
    scope: params.scope,
    state: params.state ?? null,
    codeChallenge: codeChallenge,
  });
  return res.redirect(`/${path}?requestId=${request.requestId}`);
}

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    await openSql();
    const res = new ResponseBuilder();
    const safeParameters = QueryParametersSchema.safeParse(event.queryStringParameters ?? {});
    if (!safeParameters.success) {
      return res.status(400).json({ error: JSON.parse(safeParameters.error.message) });
    }

    const params = safeParameters.data;
    const client = await getOauthClient(params.client_id);
    if (client === null) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    if (!client.redirectUris.includes(params.redirect_uri)) {
      return res.status(400).json({ error: 'Invalid redirect_uri' });
    }
    const codeChallenge = params.code_challenge ?? null;
    const codeChallengeMethod = params.code_challenge_method ?? null;

    if (codeChallengeMethod !== null && codeChallenge === null) {
      return res.status(400).json({ error: 'code_challenge_method provided without code_challenge' });
    }

    if (codeChallenge !== null) {
      // RFC 7636 mandates code_challenge and requires code_challenge_method.
      // We explicitly reject "plain" for security: only S256 is acceptable.
      if (codeChallengeMethod === 'plain') {
        return res.status(400).json({ error: '"plain" code_challenge_method is not supported; use "S256"' });
      }
      if (codeChallengeMethod !== 'S256') {
        return res.status(400).json({ error: 'code_challenge_method must be "S256" when code_challenge is provided' });
      }
    }

    const scope = normalizeScopeString(params.scope ?? client.defaultScopes);
    const clientScopes = await validateClientScopes(client, scope);
    if (clientScopes.error) {
      return res.status(400).json({ error: clientScopes.message });
    }

    const cookies = parseCookieHeader(event);
    const sessionId = cookies.get('sessionId');
    if (sessionId === null) return await createConsentRequest(client, params, codeChallenge, 'login', res);

    const session = await findSessionById(sessionId);
    if (session === null) return await createConsentRequest(client, params, codeChallenge, 'login', res);

    const user = await fetchUserWithRoles(session.userId);
    if (user === null) return await createConsentRequest(client, params, codeChallenge, 'login', res);

    const consent = await findUserConsent({ userId: session.userId, clientId: client.clientId, scope });
    if (consent === null || !consent.approved) {
      return await createConsentRequest(client, params, codeChallenge, 'consent', res);
    }

    const userScopeError = validateUserScopes(user, clientScopes.systemScopes);
    if (userScopeError.error) {
      return res.status(400).json({ error: userScopeError.message });
    }

    const authorizationCode = await createAuthorizationCodeFromConsent(consent, params.redirect_uri);
    return res.redirect(authorizationCodeRedirectPath(authorizationCode, params.state ?? null));
  },
});
