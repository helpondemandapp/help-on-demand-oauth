import sql from 'mssql';
import { lrq } from '/opt/nodejs/data/sql/db.js';
import { ScopeSchema } from '/opt/nodejs/data/sql/schema.js';
import { z } from 'zod';
import type { UserLevelId } from '/opt/nodejs/data/enum.js';
import type { Client } from '/opt/nodejs/data/dynamodb/schema.js';

const createScopeTVP = (scopeNames: string[]): sql.Table => {
  const tvp = new sql.Table('dbo.ScopeNameTable');
  tvp.columns.add('Scope', sql.NVarChar(255), { nullable: false });
  for (const scopeName of scopeNames) {
    tvp.rows.add(scopeName.trim().toLowerCase());
  }
  return tvp;
};

export const getScopeDescriptionsForNames = async (
  scopeNames: string[]
): Promise<{ scope: string; description: string }[]> => {
  if (scopeNames.length === 0) return [];
  const { recordset } = await lrq()
    .request()
    .input('ScopeNames', createScopeTVP(scopeNames))
    .query<{ scope: string; description: string }>(
      `
        SELECT os.[Scope] AS [scope], os.[Description] AS [description]
        FROM dbo.[OAuthScopes] AS os
               INNER JOIN @ScopeNames AS sn ON sn.[Scope] = os.[Scope]
      `
    );
  return recordset;
};

export type ScopeWithAllowList = {
  scopeId: string;
  scope: string;
  description: string;
  userLevel: UserLevelId | null;
  maximumClientAllowed: Client['clientType'];
  allowList: string[];
};

const ScopeWithNullableRoleId = ScopeSchema.extend({
  RoleId: z.string().trim().nonempty().nullable(),
});

export const getScopesWithAllowListForNames = async (scopeNames: string[]): Promise<ScopeWithAllowList[]> => {
  if (scopeNames.length === 0) return [];

  const { recordset } = await lrq()
    .request()
    .input('ScopeNames', createScopeTVP(scopeNames))
    .query(
      `
        SELECT os.[ScopeId],
               os.[Scope] ,
               os.[Description],
               os.[UserLevel] ,
               os.[MaximumClientAllowed],
               osral.[RoleId]
        FROM dbo.[OAuthScopes] AS os
               INNER JOIN @ScopeNames AS sn ON sn.[Scope] = os.[Scope]
               LEFT JOIN dbo.[OAuthScopeRoleAllowList] AS osral ON osral.[ScopeId] = os.[ScopeId]
      `
    );

  const rows = ScopeWithNullableRoleId.array().parse(recordset);

  const scopeMap = new Map<string, ScopeWithAllowList>();
  for (const row of rows) {
    const existing =
      scopeMap.get(row.ScopeId) ??
      ({
        scopeId: row.ScopeId,
        scope: row.Scope,
        description: row.Description,
        userLevel: row.UserLevel,
        maximumClientAllowed: row.MaximumClientAllowed,
        allowList: [],
      } satisfies ScopeWithAllowList);

    if (row.RoleId) existing.allowList.push(row.RoleId);
    scopeMap.set(row.ScopeId, existing);
  }

  return Array.from(scopeMap.values());
};
