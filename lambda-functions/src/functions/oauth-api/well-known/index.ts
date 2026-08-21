import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Environment } from '/opt/nodejs/config/env.js';

const response = (content: Record<string, unknown>) => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(content),
});

const oauthAuthorizationServer = async () => ({
  issuer: `https://${Environment.AUTH_DOMAIN}`,
  authorization_endpoint: `https://${Environment.AUTH_DOMAIN}/api/authorize`,
  token_endpoint: `https://${Environment.AUTH_DOMAIN}/api/token`,
  registration_endpoint: `https://${Environment.AUTH_DOMAIN}/api/register`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  switch (event.path) {
    case '/.well-known/oauth-authorization-server':
      return response(await oauthAuthorizationServer());
  }
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'Not Found',
    }),
  };
};
