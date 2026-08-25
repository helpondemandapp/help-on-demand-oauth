import { type AttributeNameMap, type AttributeValueMap, dynamodb } from '/opt/nodejs/data/dynamodb/db.js';
import { Environment } from '/opt/nodejs/config/env.js';
import { type UserConsent, UserConsentSchema } from '/opt/nodejs/data/dynamodb/schema.js';
import type { QueryCommandOutput } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';

const USER_CLIENT_INDEX_NAME = 'idx-userIdClientId';

type FindConsentParams = {
  userId: string;
  clientId: string;
  scope: string;
};

export const findUserConsent = async ({ userId, clientId, scope }: FindConsentParams) => {
  let nextToken: Record<string, unknown> | null = null;
  const now = Date.now();
  const items: UserConsent[] = [];
  do {
    const response: QueryCommandOutput = await dynamodb.query({
      TableName: Environment.CONSENTS_TABLE_NAME,
      ExclusiveStartKey: nextToken ?? undefined,
      IndexName: USER_CLIENT_INDEX_NAME,
      KeyConditionExpression: '#userId = :userId AND #clientId = :clientId',
      FilterExpression: '#scope = :scope',
      ExpressionAttributeNames: {
        '#userId': 'userId',
        '#clientId': 'clientId',
        '#scope': 'scope',
      } satisfies AttributeNameMap<UserConsent>,
      ExpressionAttributeValues: {
        ':userId': userId,
        ':clientId': clientId,
        ':scope': scope,
      } satisfies AttributeValueMap,
    });
    nextToken = response.LastEvaluatedKey ?? null;
    const consents = z
      .array(UserConsentSchema)
      .parse(response.Items ?? [])
      .filter((consent) => consent.expiresAtUTCMillis > now);
    items.push(...consents);
  } while (nextToken !== null);
  // There should only really be one or zero consents for a given userId, clientId, and scope, but we will return the most recent one if there are multiple.
  items.sort((a, b) => b.createdAtUTCMillis - a.createdAtUTCMillis);
  return items[0] ?? null;
};
