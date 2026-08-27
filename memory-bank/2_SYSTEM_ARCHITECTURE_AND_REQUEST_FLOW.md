# System Architecture and Request Flow

## Scope
- Project: `help-on-demand-oauth`
- Focus: deployment topology, service boundaries, OAuth request orchestration, and cross-stack contracts.
- Complements `memory-bank/1_DATABASE_ARCHITECTURE.md` (data-store-focused memory).

## Deployment Topology

### Partition-based stack selection
- CDK entrypoint chooses stack by `AWS_PARTITION`:
  - `gov-cloud` -> `GovCloudStack`
  - `commercial` -> `CommercialStack`
- Source: `cdk/bin/cdk.ts`

### GovCloud stack responsibilities
- Imports existing VPC and private subnets.
- Provisions shared backend globals:
  - DynamoDB tables
  - Lambda layers
  - Lambda execution role with Secrets Manager + DynamoDB access
  - Lambda security group
- Provisions API Gateway REST API and OAuth Lambda routes.
- Source: `cdk/lib/gov-cloud-stack.ts`, `cdk/lib/services/Networks.ts`, `cdk/lib/services/GovCloudGlobals.ts`, `cdk/lib/services/OAuthApi.ts`

### Commercial stack responsibilities
- Hosts frontend SPA in S3 behind CloudFront.
- Uses CloudFront function rewrite for SPA deep-link handling.
- Proxies `api/*` and `.well-known/*` to backend invoke URL.
- Binds `AUTH_DOMAIN` via ACM certificate.
- Source: `cdk/lib/commercial-stack.ts`, `cdk/cloudFrontFunctions/spa-rewrite.js`

## Service Boundaries

### Infrastructure (`cdk/`)
- Validates environment variables and partition-specific requirements.
- Injects Lambda runtime environment (table names + auth/domain settings).
- Defines API route-to-handler mapping.
- Source: `cdk/lib/library.ts`, `cdk/lib/constructs/lambda-function.ts`, `cdk/lib/services/OAuthApi.ts`

### Backend (`lambda-functions/`)
- Handler layer: `src/functions/oauth-api/*`
  - `authorize`, `authenticate`, `consent`, `consent-request`, `approve`, `deny`, `token`, `register`, `well-known`
- Shared app logic:
  - Protocol/session/cookie wrappers: `src/common/protocol/http.ts`
  - Consent request composition: `src/common/core/consentRequests.ts`
  - Scope validation: `src/common/core/scopes.ts`
  - Runtime env and secret access: `src/common/config/env.ts`, `src/common/core/secrets.ts`
- Data adapters:
  - DynamoDB OAuth/session/consent/token state
  - SQL (roles/scopes/user/carrier lookup)
  - HOD API auth/profile lookup

### Frontend (`frontend/`)
- React app gates flow around `requestId` query parameter.
- Main routes are `/login` and `/consent`.
- Login and consent pages call backend endpoints for flow progression.
- Source: `frontend/src/containers/MainRouter/MainRouter.tsx`, `frontend/src/containers/Login/Login.tsx`, `frontend/src/containers/Consent/Consent.tsx`

## OAuth Request Flow (High-Level)
1. Client starts at `/api/authorize` with OAuth params.
2. Backend validates client, redirect URI, response type, scopes, and PKCE method.
3. Backend persists consent request and redirects user into UI flow (`/login` then `/consent`) when needed.
4. `/api/authenticate` validates credentials against HOD API, creates session, sets secure `sessionId` cookie.
5. `/api/consent` decides whether to show consent page or skip to callback based on existing consent.
6. `/api/approve` or `/api/deny` persists decision and continues redirect contract.
7. `/api/token` exchanges auth code (or refresh token) for access token; enforces replay/PKCE/client rules.
8. `/.well-known/oauth-authorization-server` publishes OAuth metadata.

## Route-to-Handler Map
- `POST /api/register` -> `oauth-api/register`
- `GET /api/authorize` -> `oauth-api/authorize`
- `POST /api/authenticate` -> `oauth-api/authenticate`
- `GET /api/consent` -> `oauth-api/consent`
- `GET /api/consent-request` -> `oauth-api/consent-request`
- `POST /api/approve` -> `oauth-api/approve`
- `GET /api/deny` -> `oauth-api/deny`
- `POST /api/token` -> `oauth-api/token`
- `GET /.well-known/*` -> `oauth-api/well-known` (proxy resource)
- Source: `cdk/lib/services/OAuthApi.ts`

## Cross-Stack Contracts
- `BACKEND_INVOKE_URL` is the commercial-to-gov-cloud API seam for `api/*` and `.well-known/*` forwarding.
- `AUTH_DOMAIN` is shared between frontend edge domain and backend issuer/discovery URLs.
- GovCloud runtime requires private-network access (`VPC_ID`, `PRIVATE_SUBNET_IDS`) and `BWS_WEB_BASE_URL` for HOD API calls.

## Environment Contracts

### CDK deployment
- Common: `ENVIRONMENT_NAME`, `AWS_ACCOUNT_ID`, `AWS_REGION`, `STACK_NAME`, `NODE_VERSION`, `AUTH_DOMAIN`
- GovCloud-only: `VPC_ID`, `PRIVATE_SUBNET_IDS`, `BWS_WEB_BASE_URL`
- Commercial-only: `CERT_ARN`, `BACKEND_INVOKE_URL`
- Source: `cdk/lib/library.ts`

### Lambda runtime
- Required: `AUTH_DOMAIN`, `BWS_WEB_BASE_URL`, and all DynamoDB table name environment variables.
- Source: `lambda-functions/src/common/config/env.ts`, `cdk/lib/constructs/lambda-function.ts`

## Operational Risks to Re-Validate on Changes
- CloudFront behavior path patterns must keep matching API routes.
- `requestId` query contract across redirects must remain intact.
- PKCE and auth-code single-use protections in token exchange must remain enforced.
- Any route additions require synchronized updates in `OAuthApi` and frontend flow where applicable.

## Edit History
- `2026-08-27T23:10:00Z` - Created: added system architecture memory covering stack topology, service boundaries, OAuth request flow, route map, and cross-stack environment contracts.

