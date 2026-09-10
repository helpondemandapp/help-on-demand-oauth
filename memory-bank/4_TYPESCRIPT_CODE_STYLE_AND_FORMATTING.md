# TypeScript Code Style and Formatting

## Scope

- Project: `help-on-demand-oauth`
- Focus: expected TypeScript/TSX formatting and style conventions across `frontend`, `lambda-functions`, `cdk`, and `tools`.

## Authoritative Style Sources

- Primary formatter: `/.prettierrc.json`
- Primary linter: `/eslint.config.mjs`
- Repo workflows: `/package.json` scripts (`format`, `format:check`, `lint`)
- PR quality workflow: `/.github/workflows/pr-quality.yml` runs lint, format check, and per-project typechecks on pull requests to `dev/main`.
- Project-level TS strictness: `frontend/tsconfig*.json`, `lambda-functions/tsconfig.json`, `cdk/tsconfig.json`, `tools/tsconfig.json`

## Formatting Expectations (Prettier)

- Use single quotes.
- Always use semicolons.
- Use 2-space indentation (no tabs).
- Use trailing commas where valid in ES5.
- Wrap lines near 120 chars.
- Always include parentheses around arrow-function parameters.
- Use LF line endings.

## Lint Expectations (ESLint)

- TypeScript uses `@eslint/js` recommended + `typescript-eslint` recommended rules.
- Unused variables are warnings (not errors) when not underscore-prefixed.
- Names starting with `_` are intentionally allowed for unused args/vars/caught errors.
- Frontend TSX includes `react-hooks` and `react-refresh` recommended rules.
- Node globals are configured for `cdk`, `lambda-functions`, and `tools`.

## TypeScript Strictness by Subproject

- `frontend`: strict mode; no unused parameters; no fallthrough in `switch`; bundler/no-emit setup.
- `lambda-functions`: strict mode; `noImplicitOverride`; `isolatedModules`; `verbatimModuleSyntax`; NodeNext emit to `dist`.
- `tools`: strict mode + `noUncheckedIndexedAccess`; `noImplicitOverride`; no-emit runtime tooling.
- `cdk`: strict mode with pragmatic relaxations (`noUnusedLocals: false`, `noUnusedParameters: false`, `strictPropertyInitialization: false`, `skipLibCheck: true`).

## Code-Level Style Patterns in Practice

- Prefer arrow functions in handlers/components and local helpers.
- Prefer `async/await` over promise chains in business logic.
- Use validation + early-return guard clauses in request handlers.
- Use explicit typing for boundary inputs and schema-validated payloads.
- Naming conventions:
  - `PascalCase`: classes, React components, exported schema/type-like constructs.
  - `camelCase`: variables/functions.
  - `UPPER_SNAKE_CASE`: environment variable keys and constant-like config fields.
  - `snake_case`: OAuth protocol field names when matching external contracts (for example `client_id`, `redirect_uri`).

## Import Ordering

- Imports are consistently at file top, but no enforced alphabetical/group-sorting rule is configured.
- Treat import ordering as convention-based unless a new lint rule is added.

## Evidence References

- `/.prettierrc.json`
- `/eslint.config.mjs`
- `/package.json`
- `/frontend/tsconfig.app.json`
- `/frontend/tsconfig.node.json`
- `/lambda-functions/tsconfig.json`
- `/cdk/tsconfig.json`
- `/tools/tsconfig.json`
- `/frontend/src/containers/Login/Login.tsx`
- `/lambda-functions/src/functions/oauth-api/token/index.ts`
- `/cdk/lib/services/OAuthApi.ts`
- `/tools/src/test-oauth-flow.ts`

## Edit History

- `2026-08-27T22:49:15Z` - Created: documented expected TypeScript formatting and style conventions from Prettier, ESLint, tsconfig settings, and representative source files.
- `2026-08-27T23:10:00Z` - Updated: added PR workflow coverage for lint/format/typecheck and noted `typecheck` scripts now exist in `frontend`, `cdk`, `lambda-functions`, and `tools`.
- `2026-08-27T23:22:00Z` - Updated: CDK `tsconfig.json` now sets `skipLibCheck: true` to avoid typechecking external declaration files.
