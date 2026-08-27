# Database Architecture

## Scope
- Project: `help-on-demand-oauth`
- Primary persistence is in GovCloud runtime (`lambda-functions` + `cdk/lib/gov-cloud-stack.ts`).
- Commercial stack does not own data stores; it serves frontend and proxies API traffic to backend.

## Data Sources Inventory

### 1) DynamoDB (authoritative OAuth state)
- Provisioned by `cdk/lib/services/DynamoDatabase.ts` with on-demand billing and deletion protection.
- Lambda table names are injected from `DynamoDBTableNames` via `cdk/lib/constructs/lambda-function.ts`.

#### Tables
1. `OAuthClients`
   - PK: `clientId`
   - Purpose: OAuth client registration metadata and secrets.
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/clients.ts`
   - Entity schema: `lambda-functions/src/common/data/dynamodb/schema.ts` (`ClientSchema`)

2. `OAuthConsentRequests`
   - PK: `requestId`, TTL attribute: `ttl`
   - Purpose: short-lived consent redirect workflow state.
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/consentRequests.ts`
   - TTL in code: 10 minutes

3. `OAuthSessions`
   - PK: `sessionId`, TTL attribute: `ttl`
   - Purpose: browser session tracking for authenticated user.
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/sessions.ts`
   - TTL in code: 30 minutes

4. `OAuthConsents`
   - PK: `consentId`, TTL attribute: `ttl`
   - GSI: `idx-userIdClientId` (PK `userId`, SK `clientId`)
   - Purpose: per-user per-client consent decision/state.
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/consents.ts`
   - TTL in code: 15 minutes

5. `OAuthAuthorizationCodes`
   - PK: `code`, TTL attribute: `ttl`
   - Purpose: one-time auth codes and refresh-token backing records.
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/authorizationCodes.ts`, `lambda-functions/src/common/data/dynamodb/oauthTokens.ts`
   - TTL in code: auth code 10 minutes; refresh token 30 days (stored as `code = rt_<token>`)

6. `OAuthAccessTokens`
   - PK: `accessTokenId`, TTL attribute: `ttl`
   - Purpose: persisted access token records (JWT + metadata).
   - Runtime modules: `lambda-functions/src/common/data/dynamodb/oauthTokens.ts`
   - TTL in code: 1 hour

### 2) SQL Server `LRQ` (external relational source)
- Not provisioned in this repo; accessed at runtime with `mssql`.
- Connection bootstrap: `lambda-functions/src/common/data/sql/db.ts` (`openSql`, singleton pool).
- Credentials source: Secrets Manager secret `db_connection_strings`.
- Connection settings: port `1433`, DB `LRQ`, `encrypt: true`, `trustServerCertificate: true`.

#### Queried domains
1. Users and roles
   - Module: `lambda-functions/src/common/data/sql/users.ts`
   - Tables: `dbo.AspNetUsers`, `dbo.AspNetUserRoles`, `dbo.AspNetRoles`
   - Purpose: user identity + authorization context.

2. OAuth scopes and allow-list policy
   - Module: `lambda-functions/src/common/data/sql/scopes.ts`
   - Tables: `dbo.OAuthScopes`, `dbo.OAuthScopeRoleAllowList`, TVP `dbo.ScopeNameTable`
   - Purpose: scope metadata, descriptions, and role-based allow-list filtering.

3. Carrier metadata
   - Module: `lambda-functions/src/common/data/sql/carriers.ts`
   - Table: `dbo.Carriers`
   - Purpose: carrier lookup by ID (used for client metadata enrichment).

### 3) AWS Secrets Manager (configuration secrets)
- Access is granted in `cdk/lib/services/GovCloudGlobals.ts`.
- Fetch layer: `lambda-functions/src/common/core/secrets.ts`.
- Runtime has in-memory secret cache (5-minute TTL).

#### Secrets used
1. `db_connection_strings`
   - Keys: `lrq_username`, `lrq_password`, `lrq_server`
   - Used by: `lambda-functions/src/common/data/sql/db.ts`

2. `web_app_auth`
   - Keys: `jwt_audience`, `jwt_secret`
   - Used by: `lambda-functions/src/common/data/dynamodb/oauthTokens.ts`

### 4) External HTTP data source: Help on Demand API
- Base URL: env var `BWS_WEB_BASE_URL`.
- Modules:
  - `lambda-functions/src/common/data/hodAPI/hodTokens.ts` (`POST /api/token`)
  - `lambda-functions/src/common/data/hodAPI/hodAccounts.ts` (`GET /api/accounts/me`)
- Purpose: user authentication and account profile retrieval during OAuth flow.

### 5) Runtime/session and token state handling
- Session cookie: emitted in `lambda-functions/src/common/protocol/http.ts` (`sessionId`, HttpOnly/Secure/SameSite=Lax).
- Session backing store: `OAuthSessions` DynamoDB.
- Auth code replay protection: `used` flag in `OAuthAuthorizationCodes`.
- Access tokens: signed JWT and persisted metadata in `OAuthAccessTokens`.

## Provisioning and Partition Differences

### GovCloud (`AWS_PARTITION=gov-cloud`)
- Creates and owns DynamoDB tables (`DynamoDatabase`), Lambda role secret grants, and VPC-bound lambdas for SQL/API access.
- Requires `VPC_ID`, `PRIVATE_SUBNET_IDS`, and `BWS_WEB_BASE_URL` (`cdk/lib/library.ts`).

### Commercial (`AWS_PARTITION=commercial`)
- Does not create DynamoDB/SQL/Secrets resources in this stack.
- Uses `BACKEND_INVOKE_URL` for API forwarding from CloudFront/S3 frontend stack.

## Environment Contracts Related to Data Sources
- Lambda runtime validation in `lambda-functions/src/common/config/env.ts` requires:
  - `OAUTH_CLIENTS_TABLE_NAME`
  - `CONSENT_REQUESTS_TABLE_NAME`
  - `SESSIONS_TABLE_NAME`
  - `CONSENTS_TABLE_NAME`
  - `AUTHORIZATION_CODES_TABLE_NAME`
  - `ACCESS_TOKENS_TABLE_NAME`
  - `AUTH_DOMAIN`
  - `BWS_WEB_BASE_URL`

## Tooling and Non-Prod Data Access
- `tools/src/test-oauth-flow.ts` reads `OAuthClients` from DynamoDB and exercises `/api/authorize` + `/api/token` (including refresh flow) using AWS SSO profile credentials.

## Edit History
- `2026-08-27T22:37:16Z` - Created: initial full inventory of database architecture and all identified data sources across DynamoDB, SQL, Secrets Manager, and external HOD API.
