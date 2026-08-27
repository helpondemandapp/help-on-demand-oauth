import type { Client } from '/opt/nodejs/data/dynamodb/schema.js';
import { getScopesWithAllowListForNames, type ScopeWithAllowList } from '/opt/nodejs/data/sql/scopes.js';
import type { UserWithRoles } from '/opt/nodejs/data/sql/users.js';

/**
 * Normalizes a scope string by removing duplicates, trimming whitespace, and sorting the scopes alphabetically.
 * @param scope - Space separated string of scopes to normalize.
 * @returns A normalized scope string with unique, trimmed, and sorted scopes.
 */
export const normalizeScopeString = (scope: string): string => {
  return Array.from(
    new Set(
      scope
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  )
    .sort()
    .join(' ');
};

export const separateScopeString = (scope: string): string[] => {
  return Array.from(
    new Set(
      scope
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  ).sort();
};

const ClientLevelOrdered = ['internal', 'private', 'public'] as const satisfies Client['clientType'][];

type ValidateClientScopesResult =
  { error: true; message: string } | { error: false; systemScopes: ScopeWithAllowList[] };

export const validateClientScopes = async (
  client: Client,
  scopeString: string
): Promise<ValidateClientScopesResult> => {
  const clientLevel = ClientLevelOrdered.indexOf(client.clientType);
  const requestedScopes = separateScopeString(scopeString);
  const foundScopes = await getScopesWithAllowListForNames(requestedScopes);
  for (const scope of requestedScopes) {
    const systemScope = foundScopes.find((s) => s.scope === scope) ?? null;
    if (systemScope === null) {
      return { error: true, message: `Scope "${scope}" is not a valid scope.` };
    }
    const scopeMaxLevel = ClientLevelOrdered.indexOf(systemScope.maximumClientAllowed);
    if (clientLevel > scopeMaxLevel) {
      return { error: true, message: `Scope "${scope}" is not allowed for client type "${client.clientType}".` };
    }
  }

  return { error: false, systemScopes: foundScopes };
};

export const validateUserScopes = (
  user: UserWithRoles,
  systemScopes: ScopeWithAllowList[]
): { error: true; message: string } | { error: false } => {
  const userRoleIds = new Set(user.Roles.map((role) => role.Id));

  for (const scope of systemScopes) {
    if (scope.userLevel !== null && user.Level !== scope.userLevel) {
      return { error: true, message: `Scope "${scope.scope}" is not allowed for user level ${user.Level}.` };
    }

    if (scope.allowList.length > 0 && !scope.allowList.some((roleId) => userRoleIds.has(roleId))) {
      return { error: true, message: `Scope "${scope.scope}" is not allowed for the user's roles.` };
    }
  }

  return { error: false };
};
