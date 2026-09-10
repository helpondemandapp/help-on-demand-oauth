import { apiRequestWithUserLambdaWrapper, error401OnUnauthorized, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';
import { normalizeScopeString } from '/opt/nodejs/core/scopes.js';
import { createNewUserConsent } from '/opt/nodejs/data/dynamodb/consents.js';

export const handler = apiRequestWithUserLambdaWrapper({
  onUnauthorized: error401OnUnauthorized(),
  callback: async (event, user) => {
    const res = new ResponseBuilder();
    const requestResult = await getConsentRequestFromParameters(JSON.parse(event.body ?? '{}'));
    if (requestResult.error) {
      return res.status(requestResult.code).json({ error: requestResult.errorBody });
    }
    const { client, consentRequest } = requestResult;
    const requestedScopes = normalizeScopeString(consentRequest.scope ?? client.defaultScopes);
    await createNewUserConsent({
      userId: user.Id.trim().toLowerCase(),
      scope: requestedScopes,
      clientId: client.clientId,
      approved: true,
      codeChallenge: consentRequest.codeChallenge ?? null,
    });
    return res.status(204).content('');
  },
});
