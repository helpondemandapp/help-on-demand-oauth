import { z } from 'zod';
import { getConsentRequest } from '/opt/nodejs/data/dynamodb/consentRequests.js';
import { setContext } from '/opt/nodejs/logging/wideEvent.js';
import { getOauthClient } from '/opt/nodejs/data/dynamodb/clients.js';
import type { Client, ConsentRequest } from '/opt/nodejs/data/dynamodb/schema.js';

type RequestReadError = {
  error: true;
  code: number;
  errorBody: unknown;
};
type RequestReadSuccess = {
  error: false;
  client: Client;
  consentRequest: ConsentRequest;
};

const RequestIdParameterSchema = z.object({
  requestId: z.string({ error: 'requestId is required' }).trim().nonempty(),
});

export const getConsentRequestFromParameters = async (
  parameters: unknown
): Promise<RequestReadSuccess | RequestReadError> => {
  const safeParameters = RequestIdParameterSchema.safeParse(parameters);
  if (!safeParameters.success) {
    return { error: true, code: 400, errorBody: JSON.parse(safeParameters.error.message) };
  }
  const consentRequest = await getConsentRequest(safeParameters.data.requestId);
  if (consentRequest === null) {
    return { error: true, code: 404, errorBody: 'Invalid requestId' };
  }
  setContext('foundConsentRequest', consentRequest);
  const client = await getOauthClient(consentRequest.clientId);
  if (client === null) {
    return { error: true, code: 500, errorBody: 'Client not found for consent request' };
  }
  if (!client.redirectUris.includes(consentRequest.redirectUri)) {
    return { error: true, code: 400, errorBody: 'Invalid redirect_uri for consent request' };
  }
  return { error: false, client, consentRequest };
};
