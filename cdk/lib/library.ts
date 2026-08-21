import { z } from 'zod';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';

export const NodeVersions = [20, 22, 24] as const;
export type NodeVersion = (typeof NodeVersions)[number];

const CommonEnv = z.object({
  AWS_ACCOUNT_ID: z.string().trim(),
  AWS_REGION: z.string().trim(),
  STACK_NAME: z.string().trim(),
  NODE_VERSION: z.preprocess(
    (v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v);
        return !isNaN(n) && Number.isInteger(n) ? n : v;
      }
      return v;
    },
    z.union(
      NodeVersions.map((v) => z.literal(v)) as [
        z.ZodLiteral<NodeVersion>,
        z.ZodLiteral<NodeVersion>,
        ...z.ZodLiteral<NodeVersion>[],
      ]
    )
  ),
  AUTH_DOMAIN: z.string().regex(/^.+\.bigwavesystems\.com/),
});

const GovCloudEnv = CommonEnv.extend({
  AWS_PARTITION: z.literal('gov-cloud'),
});

const CommercialEnv = CommonEnv.extend({
  AWS_PARTITION: z.literal('commercial'),
});

const EnvironmentSchema = z.discriminatedUnion('AWS_PARTITION', [GovCloudEnv, CommercialEnv]);

export const Environment = EnvironmentSchema.parse(process.env);

export const NodeVersionToRuntime: ReadonlyMap<NodeVersion, awsLambda.Runtime> = new Map([
  [20, awsLambda.Runtime.NODEJS_20_X],
  [22, awsLambda.Runtime.NODEJS_22_X],
]);
