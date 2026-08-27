# Authentication and Authorization Flow

## Scope
- Project: `help-on-demand-oauth`
- Focus: runtime behavior of OAuth authentication, consent, and token exchange handlers.
- Source of truth: backend code under `lambda-functions/src/functions/oauth-api` and shared modules under `lambda-functions/src/common`.

## Endpoint Contracts
- `GET /api/authorize`
  - Validates OAuth query params (`client_id`, `redirect_uri`, `response_type=code`, optional `scope`, `state`, PKCE fields).
  - Validates client and redirect URI allow-list membership.
  - PKCE policy: only `S256` is accepted when `code_challenge` is provided (`plain` is rejected).
- `POST /api/authenticate`
  - Expects JSON body with `username` and `password`.
  - Authenticates against HOD API and creates browser session on success.
- `GET /api/consent`
  - Requires authenticated session and valid `requestId`.
  - Redirects to UI consent page when consent is missing/denied; otherwise issues auth code redirect.
- `GET /api/consent-request`
  - Requires authenticated session and valid `requestId`.
  - Returns consent payload (client display name, scope descriptions, user identity).
- `POST /api/approve`
  - Requires authenticated session.
  - Expects `requestId` in request body and writes approved consent.
- `GET /api/deny`
  - Requires authenticated session and valid `requestId`.
  - Writes denied consent and redirects to client `redirect_uri` with `error=access_denied` (+ optional `state`).
- `POST /api/token`
  - Expects form-url-encoded body.
  - Supports `grant_type=authorization_code` and `grant_type=refresh_token`.
  - Enforces client authentication for non-public clients.
- `GET /.well-known/oauth-authorization-server`
  - Returns issuer metadata, endpoint URLs, supported grants/response types, and public scopes.

## Request and Redirect Contract
- `requestId` is created in `authorize` via consent-request persistence and passed through UI redirects.
- Login redirect contract: `/login?requestId=<id>`.
- Consent redirect contract: `/consent?requestId=<id>`.
- Consent request resolution validates:
  - `requestId` presence/shape,
  - consent request not expired,
  - client existence,
  - stored `redirectUri` still present in client allow-list.

## Session and Cookie Behavior
- Session cookie name: `sessionId`.
- Cookie attributes on set: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, with max-age from session TTL.
- Session backing store: `OAuthSessions` DynamoDB table.
- Session expiry: 30 minutes.
- Invalid/missing session behavior:
  - Protected endpoints return unauthorized or login redirect (endpoint-dependent).
  - Invalid session/user clears cookie (`sessionId` set with `Max-Age=0`).

## Consent Decision Behavior
- Consent lookup key semantics: latest consent by `(userId, clientId, normalized scope)`.
- If approved consent exists, flow skips consent UI and issues authorization code.
- If no consent or denied consent exists, flow redirects to consent UI.
- New consent records (approve/deny) are short-lived and include approval state.

## Token Issuance and Validation Rules
- Authorization code exchange (`grant_type=authorization_code`):
  - Requires code exists, is unexpired, not used, `client_id` match, exact `redirect_uri` match.
  - If code includes PKCE challenge, request must include `code_verifier`; SHA-256 base64url digest must match.
  - Marks authorization code as used before returning token set.
- Refresh token exchange (`grant_type=refresh_token`):
  - Refresh tokens are stored in the authorization-code table with key format `rt_<token>`.
  - Requires record exists, `client_id` match, and stored redirect URI literal `token`.
  - Issues new access/refresh pair.

## Persistence and TTLs in Flow
- Consent request (`OAuthConsentRequests`): 10 minutes.
- Session (`OAuthSessions`): 30 minutes.
- Consent (`OAuthConsents`): 15 minutes.
- Authorization code (`OAuthAuthorizationCodes`): 10 minutes with `used` replay flag.
- Access token (`OAuthAccessTokens`): 1 hour (`expires_in=3600`).
- Refresh token (stored in `OAuthAuthorizationCodes` as `rt_<token>`): 30 days.

## Key File References
- `lambda-functions/src/functions/oauth-api/authorize/index.ts`
- `lambda-functions/src/functions/oauth-api/authenticate/index.ts`
- `lambda-functions/src/functions/oauth-api/consent/index.ts`
- `lambda-functions/src/functions/oauth-api/consent-request/index.ts`
- `lambda-functions/src/functions/oauth-api/approve/index.ts`
- `lambda-functions/src/functions/oauth-api/deny/index.ts`
- `lambda-functions/src/functions/oauth-api/token/index.ts`
- `lambda-functions/src/functions/oauth-api/well-known/index.ts`
- `lambda-functions/src/common/protocol/http.ts`
- `lambda-functions/src/common/core/consentRequests.ts`
- `lambda-functions/src/common/data/dynamodb/consentRequests.ts`
- `lambda-functions/src/common/data/dynamodb/sessions.ts`
- `lambda-functions/src/common/data/dynamodb/consents.ts`
- `lambda-functions/src/common/data/dynamodb/authorizationCodes.ts`
- `lambda-functions/src/common/data/dynamodb/oauthTokens.ts`

## Edit History
- `2026-08-27T22:46:32Z` - Created: added authentication and authorization flow memory with endpoint contracts, requestId redirect contract, session/cookie behavior, consent logic, token rules, and TTL persistence details.

