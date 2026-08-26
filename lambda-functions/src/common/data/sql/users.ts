import { lrq } from '/opt/nodejs/data/sql/db.js';
import sql from 'mssql';
import { type AspNetRole, AspNetRoleSchema, type BaseUser, BaseUserSchema } from '/opt/nodejs/data/sql/schema.js';
import { z } from 'zod';

const fetchBaseUser = async (userId: string) => {
  const { recordset } = await lrq()
    .request()
    .input('UserId', sql.NVarChar(128), userId)
    .query(
      `
        SELECT [Id], [FirstName], [LastName], [Level], [Email]
        FROM dbo.[AspNetUsers]
        WHERE Id = @UserId;
      `
    );
  if (recordset.length === 0) return null;
  return BaseUserSchema.parse(recordset[0]);
};

const fetchUserRoles = async (userId: string) => {
  const { recordset } = await lrq()
    .request()
    .input('UserId', sql.NVarChar(128), userId)
    .query(
      `
        SELECT anr.*
        FROM dbo.[AspNetUserRoles] anur
               JOIN dbo.[AspNetRoles] anr ON anur.RoleId = anr.Id
        WHERE anur.UserId = @UserId;
      `
    );
  if (recordset.length === 0) return [];
  return z.array(AspNetRoleSchema).parse(recordset);
};

type UserWithRoles = BaseUser & {
  Roles: AspNetRole[];
};

export const fetchUserWithRoles = async (userId: string): Promise<UserWithRoles | null> => {
  const [user, roles] = await Promise.all([fetchBaseUser(userId), fetchUserRoles(userId)]);
  if (user === null) return null;
  return {
    ...user,
    Roles: roles,
  };
};
