import { type MinCarrier, MinCarrierSchema } from '/opt/nodejs/data/sql/schema.js';
import { lrq } from '/opt/nodejs/data/sql/db.js';
import sql from 'mssql';

export const getMinCarrierById = async (carrierId: number): Promise<MinCarrier | null> => {
  if (carrierId <= 0) return null;
  const { recordset } = await lrq()
    .request()
    .input('CarrierId', sql.Int, carrierId)
    .query(
      `
        SELECT c.[Id] AS [Id], c.[Name] AS [Name], c.[guid] AS [Guid]
        FROM dbo.[Carriers] c
        WHERE c.[Id] = @CarrierId
      `
    );
  if (recordset.length === 0) return null;
  return MinCarrierSchema.parse(recordset[0]);
};
