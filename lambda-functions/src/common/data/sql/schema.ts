import z from 'zod';
import { UserLevel } from '/opt/nodejs/data/enum.js';

export const ScopeSchema = z.object({
  ScopeId: z.string().nonempty(),
  Scope: z.string().trim().toLowerCase().nonempty(),
  Description: z.string().trim().nonempty(),
  UserLevel: z
    .union([z.literal(UserLevel.Admin), z.literal(UserLevel.Carrier), z.literal(UserLevel.Broker)])
    .nullable(), // NULL indicates all levels
  MaximumClientAllowed: z.enum(['public', 'private', 'internal']),
});
export type Scope = z.infer<typeof ScopeSchema>;

export const ScopeRoleAllowListSchema = z.object({
  ScopeId: z.string().nonempty(),
  RoleId: z.string().trim().nonempty(),
});

export const MinCarrierSchema = z.object({
  Id: z.int(),
  Name: z.string().trim().nonempty(),
  Guid: z.string().trim().nonempty(),
});
export type MinCarrier = z.infer<typeof MinCarrierSchema>;

export const BaseUserSchema = z.object({
  Id: z.string().trim().nonempty(),
  FirstName: z.string().trim(),
  LastName: z.string().trim(),
  Level: z.number().int(),
  Email: z.string().trim().nonempty(),
});
export type BaseUser = z.infer<typeof BaseUserSchema>;

export const AspNetRoleSchema = z.object({
  Id: z.string().trim().nonempty(),
  Name: z.string().trim().nonempty(),
});
export type AspNetRole = z.infer<typeof AspNetRoleSchema>;
