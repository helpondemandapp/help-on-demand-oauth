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
