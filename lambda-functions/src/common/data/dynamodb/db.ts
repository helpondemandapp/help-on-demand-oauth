import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';
import { Environment, type EnvironmentTableNameKeys } from '/opt/nodejs/config/env.js';

export type AttributeNameMap<T extends object> = { [k: `#${string}`]: keyof T };
export type AttributeValueMap<Values = unknown> = { [k: `:${string}`]: Values };

export const dynamodb = DynamoDBDocument.from(new DynamoDBClient());

type SchemaGetParams<ItemSchema extends z.ZodType, SchemaKeys extends keyof z.infer<ItemSchema>> = {
  tableNameEnvVariable: EnvironmentTableNameKeys;
  schema: ItemSchema;
  key: Pick<z.infer<ItemSchema>, SchemaKeys>;
};
export const dynamoSchemaGet = async <ItemSchema extends z.ZodType, SchemaKeys extends keyof z.infer<ItemSchema>>({
  tableNameEnvVariable,
  schema,
  key,
}: SchemaGetParams<ItemSchema, SchemaKeys>): Promise<z.infer<ItemSchema> | null> => {
  const response = await dynamodb.get({
    TableName: Environment[tableNameEnvVariable],
    Key: key,
  });
  const item = response.Item ?? null;
  if (item === null) return null;
  return schema.parse(item);
};
