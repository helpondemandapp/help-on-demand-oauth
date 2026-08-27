import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromSSO } from '@aws-sdk/credential-providers';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import open from 'open';

const sts = new STSClient({ credentials: fromSSO({ profile: 'dev-admin' }) });

await sts.send(new GetCallerIdentityCommand({}));
// this makes sure that the SSO credentials are valid and will throw an error if they are not

const dynamo = new DynamoDBClient({ credentials: fromSSO({ profile: 'dev-admin' }) });
const db = DynamoDBDocument.from(dynamo);

const clientResponse = await db.get({
  TableName: 'OAuthClients',
  Key: { clientId: 'some-oauth-client' },
});
const clientItem = clientResponse.Item ?? null;
if (clientItem === null) {
  throw new Error('Client not found');
}

const authServerBaseUrl = 'https://dev-auth.bigwavesystems.com';

const client = clientItem as { clientId: string; clientSecret: string; redirectUris: string[] };

const callbackPath = '/oauth/callback';
const callbackPort = 48581;
const callbackBaseUrl = `http://localhost:${callbackPort}`;
const redirectUri = `${callbackBaseUrl}${callbackPath}`;
if (!client.redirectUris.includes(redirectUri)) {
  throw new Error(`Client does not allow redirect URI: ${redirectUri}`);
}

const state = randomBytes(16).toString('hex');
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const authorizeUrl = new URL('/api/authorize', authServerBaseUrl);
authorizeUrl.searchParams.set('client_id', client.clientId);
authorizeUrl.searchParams.set('redirect_uri', redirectUri);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('scope', 'user:read:email');
authorizeUrl.searchParams.set('state', state);
authorizeUrl.searchParams.set('code_challenge', codeChallenge);
authorizeUrl.searchParams.set('code_challenge_method', 'S256');

const app = express();
const server = app.listen(callbackPort, () => {
  console.log(`Callback server listening at ${callbackBaseUrl}`);
  console.log(`Opening browser for authorize URL:\n${authorizeUrl.toString()}`);
  open(authorizeUrl.toString(), { wait: false }).then();
});

app.get(callbackPath, (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : null;
  const returnedState = typeof req.query.state === 'string' ? req.query.state : null;
  const error = typeof req.query.error === 'string' ? req.query.error : null;

  if (error !== null) {
    console.error(`Authorization failed with error: ${error}`);
    res.status(400).send(`Authorization failed: ${error}`);
    server.close();
    return;
  }

  if (code === null) {
    console.error('No authorization code returned');
    res.status(400).send('Missing authorization code');
    server.close();
    return;
  }

  if (returnedState !== state) {
    console.error(`State mismatch. Expected ${state}, got ${returnedState}`);
    res.status(400).send('State mismatch');
    server.close();
    return;
  }

  console.log(`Authorization code: ${code}`);
  console.log(`PKCE code_verifier (use this on token exchange): ${codeVerifier}`);
  res.status(200).send('Authorization code captured. You can close this tab.');
  server.close();
});
