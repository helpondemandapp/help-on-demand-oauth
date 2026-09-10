import { Environment } from '/opt/nodejs/config/env.js';
import { apiRequestLambdaWrapper, ResponseBuilder } from '/opt/nodejs/protocol/http.js';
import { openSql } from '/opt/nodejs/data/sql/db.js';
import { publicScopes } from '/opt/nodejs/data/sql/scopes.js';

const oauthAuthorizationServer = async () => {
  await openSql();
  return {
    issuer: `https://${Environment.AUTH_DOMAIN}`,
    authorization_endpoint: `https://${Environment.AUTH_DOMAIN}/api/authorize`,
    token_endpoint: `https://${Environment.AUTH_DOMAIN}/api/token`,
    registration_endpoint: `https://${Environment.AUTH_DOMAIN}/api/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: await publicScopes(),
  };
};

export const handler = apiRequestLambdaWrapper({
  callback: async (event) => {
    const res = new ResponseBuilder();

    switch (event.path) {
      case '/.well-known/oauth-authorization-server':
        return res.status(200).json(await oauthAuthorizationServer());
    }

    return res.status(404).json({ error: 'Not Found' });
  },
});
