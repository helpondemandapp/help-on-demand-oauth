import {
  apiRequestLambdaWrapper,
  httpOnlyCookie,
  parseCookieHeader,
  ResponseBuilder,
} from '/opt/nodejs/protocol/http.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';
import { findSessionById } from '/opt/nodejs/data/dynamodb/sessions.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { normalizeScopeString, separateScopeString } from '/opt/nodejs/core/scopes.js';
import { getMinCarrierById } from '/opt/nodejs/data/sql/carriers.js';
import { getScopeDescriptionsForNames } from '/opt/nodejs/data/sql/scopes.js';
import { openSql } from '/opt/nodejs/data/sql/db.js';
import { fetchUserWithRoles } from '/opt/nodejs/data/sql/users.js';

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    await openSql();
    const res = new ResponseBuilder();
    const requestResult = await getConsentRequestFromParameters(event.queryStringParameters ?? {});
    if (requestResult.error) {
      return res.status(requestResult.code).json({ error: requestResult.errorBody });
    }
    const { consentRequest, client } = requestResult;
    const cookies = parseCookieHeader(event);
    const sessionId = cookies.get('sessionId');
    if (sessionId === null) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = await findSessionById(sessionId);
    if (session === null) {
      return res.setCookie('sessionId', '', httpOnlyCookie(0)).status(401).json({ error: 'Unauthorized' });
    }
    const user = await fetchUserWithRoles(session.sessionId);
    if (user === null) {
      return res.setCookie('sessionId', '', httpOnlyCookie(0)).status(401).json({ error: 'Unauthorized' });
    }
    setContext('sessionUser', user);
    const requestedScopes = normalizeScopeString(consentRequest.scope ?? client.defaultScopes);
    const scopeNames = await getScopeDescriptionsForNames(separateScopeString(requestedScopes));
    let clientName: string = 'A Client';
    const clientNameMetadata = client.metadata?.name ?? null;
    const clientCarrierIdMetadata = client.metadata?.hodCarrierId ?? null;
    if (clientNameMetadata !== null) {
      clientName = clientNameMetadata;
    } else if (clientCarrierIdMetadata !== null) {
      const carrier = await getMinCarrierById(clientCarrierIdMetadata);
      if (carrier !== null) {
        clientName = carrier.Name;
      }
    }
    return res.status(200).json({
      scopes: scopeNames,
      client: {
        name: clientName,
      },
      user: {
        email: user.Email,
        firstName: user.FirstName,
        lastName: user.LastName,
      },
    });
  },
});
