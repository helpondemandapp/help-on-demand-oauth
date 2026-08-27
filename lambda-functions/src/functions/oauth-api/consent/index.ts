import {
  apiRequestWithUserLambdaWrapper,
  redirectToLoginOnUnAuthorized,
  ResponseBuilder,
} from '/opt/nodejs/protocol/http.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { normalizeScopeString, validateClientScopes } from '/opt/nodejs/core/scopes.js';
import { findUserConsent } from '/opt/nodejs/data/dynamodb/consents.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';
import { authorizationCodeRedirectPath, createAuthorizationCodeFromConsent } from '/opt/nodejs/data/dynamodb/authorizationCodes.js';

export const handler = apiRequestWithUserLambdaWrapper({
  onUnauthorized: redirectToLoginOnUnAuthorized(),
  callback: async (event, user) => {
    const res = new ResponseBuilder();
    const requestResult = await getConsentRequestFromParameters(event.queryStringParameters ?? {});
    if (requestResult.error) {
      return res.status(requestResult.code).json({ error: requestResult.errorBody });
    }
    const { client, consentRequest } = requestResult;
    const requestedScopes = normalizeScopeString(consentRequest.scope ?? client.defaultScopes);
    setContext('requestedScopes', requestedScopes);
    const consent = await findUserConsent({ userId: user.Id, clientId: client.clientId, scope: requestedScopes });
    if (consent === null) {
      return res.redirect(`/consent?requestId=${consentRequest.requestId}`);
    }
    setContext('foundConsent', consent);
    // the most recent consent was denied, so we need to show the consent page again
    if (!consent.approved) {
      return res.redirect(`/consent?requestId=${consentRequest.requestId}`);
    }
    const clientScopes = await validateClientScopes(client, requestedScopes);
    if (clientScopes.error) {
      return res.status(400).json({ error: clientScopes.message });
    }
    // note we dont really need to revalidate user scope access since we already did that in the authorize endpoint.
    const authorizationCode = await createAuthorizationCodeFromConsent(consent, consentRequest.redirectUri);
    return res.redirect(authorizationCodeRedirectPath(authorizationCode, consentRequest.state ?? null));
  },
});
