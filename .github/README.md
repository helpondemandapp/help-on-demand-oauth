# Help on Demand OAuth

This repository contains the full Help on Demand OAuth delivery surface: backend OAuth APIs, AWS infrastructure, frontend login/consent experience, and developer tooling for flow validation.

Use this document as the quick-start orientation. For implementation standards and task execution details, follow `AGENTS.md` at the repository root.

## Architecture at a glance

- **GovCloud side (`cdk` + `lambda-functions`)**
  - Deploys OAuth API Lambda handlers and related data/service integrations.
  - Handles authorization, consent, token issuance, authentication, and OIDC metadata endpoints.
- **Commercial side (`cdk`)**
  - Deploys CloudFront + S3 for frontend hosting.
  - Routes `api/*` and `.well-known/*` requests to the backend invoke URL.
- **Frontend (`frontend`)**
  - React app for login and consent flows.
  - Uses requestId-driven routing to keep authorization request context.
- **Developer tools (`tools`)**
  - Includes OAuth flow harness (`test-oauth-flow`) for manual local validation of authorize/token/refresh flows.

## Repository layout

- `cdk/`
  - CDK app and stacks.
  - `lib/gov-cloud-stack.ts` and `lib/commercial-stack.ts` are primary stack entry points.
- `lambda-functions/`
  - OAuth handler implementations under `src/functions/oauth-api`.
  - Shared logic, protocol helpers, and data adapters under `src/common`.
- `frontend/`
  - Vite + React app under `src/`.
  - Main route handling in `src/containers/MainRouter/MainRouter.tsx`.
- `tools/`
  - Helper scripts for developer workflows (not production runtime).
- `.github/workflows/build.yml`
  - Main CI/CD workflow for build and deployment.

## Build and validation commands

Run commands in the corresponding directory:

- **Root**
  - `npm run lint`
  - `npm run format:check`
- **lambda-functions**
  - `npm run build`
  - `npm run typecheck`
- **cdk**
  - `npm run build`
  - `npm run cdk -- synth`
  - `npm run cdk -- diff` (for infra changes)
- **frontend**
  - `npm run build`
  - `npm run dev`
- **tools**
  - `npm run test-oauth-flow`

## CI/CD workflow behavior

`build.yml` executes four jobs:

1. `build-gov-cloud`: compiles lambdas, packages runtime dependencies, deploys GovCloud stack.
2. `build-frontend`: builds frontend and uploads artifact.
3. `deploy-commercial`: deploys commercial stack and emits S3 bucket + CloudFront distribution outputs.
4. `deploy-frontend`: syncs frontend build to S3 and invalidates CloudFront.

Deployment behavior is environment-driven through GitHub environment variables and assumed AWS roles.

## Working in this repo

- Start with `AGENTS.md` before making changes.
- Keep edits scoped to the relevant subproject.
- Keep docs in sync with behavior changes.
- Avoid modifying generated artifacts unless required by task intent.

## Related docs

- `..\AGENTS.md` (primary contributor/agent operating guide)
- `..\cdk\README.md`
- `..\frontend\README.md`
