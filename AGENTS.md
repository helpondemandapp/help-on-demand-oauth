# AGENTS.md

This document is the operational guide for developers and coding agents working in this repository.

## 1) What this project is

Help on Demand OAuth is a multi-part TypeScript project that provides:

- an OAuth backend API running in AWS Lambda (GovCloud),
- cloud infrastructure and deployment orchestration using AWS CDK,
- a React frontend that drives login/consent user flows,
- utility tooling for local OAuth-flow testing.

Core deployment behavior is defined in `.github/workflows/build.yml`:

- `build-gov-cloud`: builds/deploys lambdas + GovCloud API stack.
- `build-frontend`: builds frontend bundle.
- `deploy-commercial`: deploys commercial-side CloudFront/S3 stack and points `/api/*` + `/.well-known/*` to backend invoke URL.
- `deploy-frontend`: uploads frontend artifact to S3 and invalidates CloudFront.

## 2) Repository map

- `cdk/`
  - CDK app and stacks.
  - `lib/gov-cloud-stack.ts`: GovCloud infrastructure entry stack.
  - `lib/commercial-stack.ts`: Commercial stack (S3 + CloudFront + cert + API proxy behavior).
- `lambda-functions/`
  - OAuth backend source.
  - `src/functions/oauth-api/*`: Lambda handlers (`authorize`, `token`, `authenticate`, `consent`, `approve`, `deny`, `register`, `consent-request`, `well-known`).
  - `src/common/*`: shared config, persistence adapters, protocol helpers, scope/consent/session logic.
- `frontend/`
  - Vite + React app.
  - `src/containers/MainRouter/MainRouter.tsx`: route gating around `requestId`.
  - `src/containers/Login/*` and `src/containers/Consent/*`: user flow screens.
  - `src/api/*`, `src/contexts/*`, `src/library/*`: API helpers and app state.
- `tools/`
  - Local/supporting scripts.
  - `src/test-oauth-flow.ts`: local browser + callback test harness for authorization code and refresh-token flow.
- `.github/`
  - High-level repository docs and CI/CD workflows.

## 3) Runtime and language

- Language: TypeScript (ES modules across packages).
- Node ecosystem with separate `package.json` in root and each subproject.
- Frontend: React 19 + Vite.
- Infra: AWS CDK v2.
- Backend data integrations:
  - DynamoDB tables for OAuth entities and sessions.
  - SQL-backed user/scope lookups (see `lambda-functions/src/common/data/sql/*`).

## 4) Working rules for code changes

1. Scope changes to the correct project boundary (`cdk`, `lambda-functions`, `frontend`, `tools`).
2. Do not change generated build outputs (`dist`, packaged artifacts) unless the task explicitly requires it.
3. Preserve OAuth protocol behavior unless the task explicitly changes it (redirect validation, state handling, consent branching, token exchange semantics).
4. Reuse existing shared modules in `lambda-functions/src/common` before adding new helpers.
5. Keep cloud changes environment-safe:
   - GovCloud logic belongs in `GovCloudStack` and related services.
   - Commercial distribution/routing logic belongs in `CommercialStack`.
6. When changing API contracts or flow behavior, update frontend and docs in the same task.

## 5) How to run and validate

Run commands from the relevant folder.

### Root

- `npm run lint`
- `npm run format:check`
- `npm run format`

### Lambda backend (`lambda-functions/`)

- `npm run build`
- `npm run typecheck`

### CDK (`cdk/`)

- `npm run build`
- `npm run cdk -- synth`
- `npm run cdk -- diff` (when infrastructure behavior changes)

### Frontend (`frontend/`)

- `npm run build`
- `npm run dev` (for local UI work)

### Tools (`tools/`)

- `npm run test-oauth-flow` (integration-style local OAuth journey helper)

Validation strategy:

1. Run the smallest set of checks that cover your changed surface.
2. If you touch cross-cutting behavior (OAuth flow + UI + infra contracts), run checks in all affected subprojects.

## 6) Typical task routing

- OAuth endpoint behavior, validation, scopes, consent, sessions, token flow:
  - `lambda-functions/src/functions/oauth-api/*`
  - `lambda-functions/src/common/core/*`
  - `lambda-functions/src/common/data/*`
- API gateway/infrastructure wiring, lambda packaging, environment wiring:
  - `cdk/lib/services/*`
  - `cdk/lib/constructs/*`
  - `cdk/lib/*stack.ts`
- Login/consent UX, route transitions, request ID handling:
  - `frontend/src/containers/*`
  - `frontend/src/components/*`
  - `frontend/src/contexts/*`
- End-to-end smoke-style OAuth checks:
  - `tools/src/test-oauth-flow.ts`

## 7) Deployment and environment notes

- CI uses role-assumption for AWS credentials in both GovCloud and commercial accounts.
- Lambda build artifacts are copied into `cdk/code/lambda/...` during workflow execution.
- Frontend is deployed as static assets to S3 behind CloudFront.
- CloudFront forwards API traffic to backend invoke URL paths (`api/*`, `.well-known/*`).
- Environment variables in workflow drive account/region/domain-specific behavior. Keep names and semantics stable unless intentionally migrating.

## 8) Definition of done for contributors/agents

A task is complete when all are true:

1. The requested behavior is implemented in the correct subproject(s).
2. Any impacted docs are updated (`AGENTS.md`, `.github/README.md`, or subproject READMEs as needed).
3. Relevant project-level checks pass for changed surfaces.
4. No unrelated files are modified.

## 9) Key docs

- Repo-level orientation: `.github/README.md`
- CDK notes: `cdk/README.md`
- Frontend notes: `frontend/README.md`
