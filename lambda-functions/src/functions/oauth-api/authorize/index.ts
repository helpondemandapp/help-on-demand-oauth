import { apiRequestLambdaWrapper, parseCookieHeader, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import { createNewConsentRequest } from '/opt/nodejs/data/dynamodb/consentRequests.js';
import { getOauthClient } from '/opt/nodejs/data/dynamodb/clients.js';

const QueryParametersSchema = z.object({
  client_id: z.string().nonempty('client_id is required'),
  redirect_uri: z.string().trim().nonempty('redirect_uri must be a valid URL'),
  response_type: z.enum(['code'], 'response_type must be "code"'),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['plain', 'S256']).optional(),
});

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
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

    const cookies = parseCookieHeader(event);
    const sessionId = cookies.get('sessionId');
    if (sessionId === null) {
      const request = await createNewConsentRequest({
        clientId: client.clientId,
        redirectUri: params.redirect_uri,
        scope: params.scope ?? null,
        state: params.state ?? null,
        codeChallenge: codeChallenge,
      });
      return res.redirect(`/login?requestId=${request.requestId}`);
    }
    // todo use case: user is logged in but has not consented
    // todo use case: user is logged in and has consented
    return res.status(200).json({ message: 'Hello world!' });
  },
});
