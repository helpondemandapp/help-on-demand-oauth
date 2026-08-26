import sql from 'mssql';
import { lrq } from '/opt/nodejs/data/sql/db.js';

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
