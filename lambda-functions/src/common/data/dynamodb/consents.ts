import * as crypto from 'node:crypto';
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
        ':userId': userId.trim().toLowerCase(),
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

type GeneratedConsentKeys = 'consentId' | 'createdAtUTCMillis' | 'expiresAtUTCMillis' | 'ttl';

export const createNewUserConsent = async (consent: Omit<UserConsent, GeneratedConsentKeys>): Promise<UserConsent> => {
  const createdAtUTCMillis = Date.now();
  const expiresAtUTCMillis = createdAtUTCMillis + 15 * 60 * 1000; // 15 minutes
  const ttl = Math.floor(expiresAtUTCMillis / 1000); // DynamoDB TTL is in seconds
  let retries = 0;
  const maxRetries = 5;
  while (retries < maxRetries) {
    try {
      const item: UserConsent = Object.fromEntries(
        Object.entries({
          consentId: crypto.randomBytes(16).toString('base64url'),
          createdAtUTCMillis,
          expiresAtUTCMillis,
          ttl,
          ...consent,
          userId: consent.userId.trim().toLowerCase(),
        }).filter(([, value]) => value !== null)
      ) as UserConsent;
      await dynamodb.put({
        TableName: Environment.CONSENTS_TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(consentId)',
      });
      return item;
    } catch {
      retries++;
    }
  }
  throw new Error(`Failed to create a unique user consent after ${retries} attempts`);
};
