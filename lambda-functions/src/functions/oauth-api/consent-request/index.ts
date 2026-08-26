import { apiRequestWithUserLambdaWrapper, error401OnUnauthorized, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { getConsentRequestFromParameters } from '/opt/nodejs/core/consentRequests.js';
import { normalizeScopeString, separateScopeString } from '/opt/nodejs/core/scopes.js';
import { getMinCarrierById } from '/opt/nodejs/data/sql/carriers.js';
import { getScopeDescriptionsForNames } from '/opt/nodejs/data/sql/scopes.js';

export const handler = apiRequestWithUserLambdaWrapper({
  onUnauthorized: error401OnUnauthorized(),
  callback: async (event, user) => {
    const res = new ResponseBuilder();
    const requestResult = await getConsentRequestFromParameters(event.queryStringParameters ?? {});
    if (requestResult.error) {
      return res.status(requestResult.code).json({ error: requestResult.errorBody });
    }
    const { consentRequest, client } = requestResult;
    const scopeNames = await getScopeDescriptionsForNames(
      separateScopeString(normalizeScopeString(consentRequest.scope ?? client.defaultScopes))
    );
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
