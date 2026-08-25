import {
  apiRequestLambdaWrapper,
  httpOnlyCookie,
  parseCookieHeader,
  ResponseBuilder,
} from '/opt/nodejs/protocol/http.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import { getConsentRequest } from '/opt/nodejs/data/dynamodb/consentRequests.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { getOauthClient } from '/opt/nodejs/data/dynamodb/clients.js';
import { findSessionById } from '/opt/nodejs/data/dynamodb/sessions.js';
import { normalizeScopeString } from '/opt/nodejs/core/scopes.js';

const GetRequestParametersSchema = z.object({
  requestId: z.string({ error: 'requestId is required' }).trim().nonempty(),
});

const getHandler = async (event: APIGatewayProxyEvent): Promise<ResponseBuilder> => {
  const res = new ResponseBuilder();
  const safeParameters = GetRequestParametersSchema.safeParse(event.queryStringParameters ?? {});
  if (!safeParameters.success) {
    return res.status(400).json({ error: JSON.parse(safeParameters.error.message) });
  }
  const consentRequest = await getConsentRequest(safeParameters.data.requestId);
  if (consentRequest === null) {
    return res.status(404).json({ error: 'Invalid requestId' });
  }
  setContext('foundConsentRequest', consentRequest);
  const client = await getOauthClient(consentRequest.clientId);
  if (client === null) {
    return res.status(500).json({ error: 'Client not found for consent request' });
  }
  if (!client.redirectUris.includes(consentRequest.redirectUri)) {
    return res.status(400).json({ error: 'Invalid redirect_uri for consent request' });
  }
  const cookies = parseCookieHeader(event);
  const sessionId = cookies.get('sessionId');
  if (sessionId === null) {
    return res.redirect(`/login?requestId=${consentRequest.requestId}`);
  }
  const session = await findSessionById(sessionId);
  if (session === null) {
    return res.setCookie('sessionId', '', httpOnlyCookie(0)).redirect(`/login?requestId=${consentRequest.requestId}`);
  }
  setContext('userId', session.userId);
  const requestedScopes = normalizeScopeString(consentRequest.scope ?? client.defaultScopes);
  setContext('requestedScopes', requestedScopes);
  // todo find the consent
  return new ResponseBuilder().status(500).json({ message: 'GET request received' });
};

const postHandler = async (_event: APIGatewayProxyEvent): Promise<ResponseBuilder> => {
  return new ResponseBuilder().status(500).json({ message: 'POST request received' });
};

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    switch (event.httpMethod.trim().toLowerCase()) {
      case 'get':
        return await getHandler(event);
      case 'post':
        return await postHandler(event);
    }
    return new ResponseBuilder().status(405).json({ message: 'Method Not Allowed' });
  },
});
