import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { z } from 'zod';
import type { Client } from '/opt/nodejs/data/dynamodb/schema.js';
import { createClient } from '/opt/nodejs/data/dynamodb/clients.js';

const RequestBodySchema = z.object({
  redirect_uris: z.array(z.string().trim().nonempty()).min(1),
  token_endpoint_auth_method: z.string().trim().toLowerCase().optional(),
  grant_types: z.array(z.string().trim().toLowerCase()).optional(),
  response_types: z.array(z.string().trim().toLowerCase()).optional(),
  client_name: z.string().trim().optional(),
  client_uri: z.string().trim().optional(),
});

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();
    const safeBody = RequestBodySchema.safeParse(JSON.parse(event.body ?? '{}'));
    if (!safeBody.success) {
      return res.status(400).json({ error: 'body_parse_error', error_description: 'Unable to parse request body.' });
    }

    const body = safeBody.data;

    const tokenEndpointAuthMethod = body.token_endpoint_auth_method ?? 'client_secret_basic';
    if (tokenEndpointAuthMethod === 'client_secret_basic') {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'client_secret_basic is not allowed for public clients.',
      });
    }
    const uniqueResponseTypes = Array.from(new Set(body.response_types ?? []));
    if (uniqueResponseTypes.length !== 1 || uniqueResponseTypes[0] !== 'code') {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Only response_type "code" is allowed for public clients.',
      });
    }

    const uniqueGrantTypes = Array.from(new Set(body.grant_types ?? []));
    if (uniqueGrantTypes.length === 0) {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'At least one grant_type is required for public clients.',
      });
    }
    if (uniqueGrantTypes.some((gt) => gt !== 'authorization_code' && gt !== 'refresh_token')) {
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'Only grant_types "authorization_code" and "refresh_token" are allowed for public clients.',
      });
    }

    const clientType = tokenEndpointAuthMethod === 'none' ? 'public' : 'private';

    const clientName = body.client_name ?? null;
    const clientUri = body.client_uri ?? null;

    const clientMetadata: Client['metadata'] = {
      ...(clientName !== null ? { name: clientName } : {}),
      ...(clientUri !== null ? { uri: clientUri } : {}),
    };

    const now = Math.floor(Date.now() / 1000);
    const client = await createClient({
      clientType,
      redirectUris: body.redirect_uris,
      metadata: clientMetadata,
    });
    return res.status(201).json({
      client_id: client.clientId,
      client_id_issued_at: now,
      ...(client.clientType !== 'public'
        ? {
            client_secret: client.clientSecret,
            client_secret_expires_at: 0,
          }
        : {}),
      redirect_uris: client.redirectUris,
      grant_types: uniqueGrantTypes,
      response_types: uniqueResponseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      ...(clientName !== null ? { client_name: clientName } : {}),
      ...(clientUri !== null ? { client_uri: clientUri } : {}),
    });
  },
});
