export const UserLevel = {
  Admin: 1,
  Carrier: 2,
  Broker: 3,
} as const;
export type UserLevelId = (typeof UserLevel)[keyof typeof UserLevel];
