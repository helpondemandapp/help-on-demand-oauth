import {
  apiRequestLambdaWrapper,
  httpOnlyCookie,
  parseCookieHeader,
  ResponseBuilder,
} from '/opt/nodejs/protocol/http.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { findSessionById } from '/opt/nodejs/data/dynamodb/sessions.js';
import { normalizeScopeString } from '/opt/nodejs/core/scopes.js';
import { findUserConsent } from '/opt/nodejs/data/dynamodb/consents.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';

const getHandler = async (event: APIGatewayProxyEvent): Promise<ResponseBuilder> => {
  const res = new ResponseBuilder();
  const requestResult = await getConsentRequestFromParameters(event.queryStringParameters ?? {});
  if (requestResult.error) {
    return res.status(requestResult.code).json({ error: requestResult.errorBody });
  }
  const { client, consentRequest } = requestResult;
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
  const consent = await findUserConsent({ userId: session.userId, clientId: client.clientId, scope: requestedScopes });
  if (consent === null) {
    return res.redirect(`/consent?requestId=${consentRequest.requestId}`);
  }
  setContext('foundConsent', consent);
  // the most recent consent was denied, so we need to show the consent page again
  if (!consent.approved) {
    return res.redirect(`/consent?requestId=${consentRequest.requestId}`);
  }
  // todo: create auth code and redirect to the redirect_uri with the code and state
  return new ResponseBuilder().status(500).json({ message: 'Consent found. Auth code not implemented yet.' });
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
