import { z } from 'zod';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as awsLogs from 'aws-cdk-lib/aws-logs';

export const NodeVersions = [20, 22, 24] as const;
export type NodeVersion = (typeof NodeVersions)[number];

const CommonEnv = z.object({
  ENVIRONMENT_NAME: z.enum(['Development', 'QA', 'Staging', 'Production']),
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
  VPC_ID: z.string().trim(),
  PRIVATE_SUBNET_IDS: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return v;
      const rows = v
        .trim()
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return rows.map((row) =>
        row
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      );
    },
    z.array(z.array(z.string().trim().min(1)).length(3)).min(1)
  ),
});

const CommercialEnv = CommonEnv.extend({
  AWS_PARTITION: z.literal('commercial'),
  CERT_ARN: z.string().trim().nonempty(),
});

const EnvironmentSchema = z.discriminatedUnion('AWS_PARTITION', [GovCloudEnv, CommercialEnv]);

export const Environment = EnvironmentSchema.parse(process.env);

export const NodeVersionToRuntime: ReadonlyMap<NodeVersion, awsLambda.Runtime> = new Map([
  [20, awsLambda.Runtime.NODEJS_20_X],
  [22, awsLambda.Runtime.NODEJS_22_X],
]);

type EnvironmentConfig = {
  lambdaLogRetentionDays: awsLogs.RetentionDays;
};

const environmentConfigs = {
  Development: { lambdaLogRetentionDays: awsLogs.RetentionDays.ONE_WEEK },
  QA: { lambdaLogRetentionDays: awsLogs.RetentionDays.ONE_WEEK },
  Staging: { lambdaLogRetentionDays: awsLogs.RetentionDays.ONE_WEEK },
  Production: { lambdaLogRetentionDays: awsLogs.RetentionDays.ONE_MONTH },
} as const satisfies Record<typeof Environment.ENVIRONMENT_NAME, EnvironmentConfig>;

export const EnvironmentConfig = environmentConfigs[Environment.ENVIRONMENT_NAME];
