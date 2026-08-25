import { Construct } from 'constructs';
import { aws_dynamodb as dynamodb, aws_iam as iam } from 'aws-cdk-lib';
import { BillingMode } from 'aws-cdk-lib/aws-dynamodb';

type TableName = `OAuth${Uppercase<string>}${string}`;

export const DynamoDBTableNames = {
  OAUTH_CLIENTS_TABLE_NAME: 'OAuthClients',
  CONSENT_REQUESTS_TABLE_NAME: 'OAuthConsentRequests',
  SESSIONS_TABLE_NAME: 'OAuthSessions',
  CONSENTS_TABLE_NAME: 'OAuthConsents',
} as const satisfies Record<`${Uppercase<string>}_TABLE_NAME`, TableName>;
export type DynamoDBTableName = (typeof DynamoDBTableNames)[keyof typeof DynamoDBTableNames];

export default class DynamoDatabase extends Construct {
  private tables: Map<DynamoDBTableName, dynamodb.Table> = new Map();

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.createTable(DynamoDBTableNames.OAUTH_CLIENTS_TABLE_NAME, {
      partitionKey: { type: dynamodb.AttributeType.STRING, name: 'clientId' },
    });

    this.createTable(DynamoDBTableNames.CONSENT_REQUESTS_TABLE_NAME, {
      partitionKey: { type: dynamodb.AttributeType.STRING, name: 'requestId' },
      timeToLiveAttribute: 'ttl',
    });

    this.createTable(DynamoDBTableNames.SESSIONS_TABLE_NAME, {
      partitionKey: { type: dynamodb.AttributeType.STRING, name: 'sessionId' },
      timeToLiveAttribute: 'ttl',
    });

    this.createTable(DynamoDBTableNames.CONSENTS_TABLE_NAME, {
      partitionKey: { type: dynamodb.AttributeType.STRING, name: 'consentId' },
      timeToLiveAttribute: 'ttl',
      globalSecondaryIndices: [
        {
          indexName: 'idx-userIdClientId',
          partitionKey: { type: dynamodb.AttributeType.STRING, name: 'userId' },
          sortKey: { type: dynamodb.AttributeType.STRING, name: 'clientId' },
          projectionType: dynamodb.ProjectionType.ALL,
        },
      ],
    });
  }

  grantReadWrite(grantable: iam.IGrantable) {
    for (const [, table] of this.tables.entries()) {
      table.grantReadWriteData(grantable);
    }
  }

  private createTable(
    tableName: DynamoDBTableName,
    props: Omit<dynamodb.TableProps, 'tableName' | 'billingMode' | 'deletionProtection'> & {
      globalSecondaryIndices?: [dynamodb.GlobalSecondaryIndexProps, ...dynamodb.GlobalSecondaryIndexProps[]];
    }
  ) {
    const { globalSecondaryIndices, ...tableProps } = props;
    const table = new dynamodb.Table(this, tableName, {
      tableName,
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      ...tableProps,
    });
    const indexes = globalSecondaryIndices ?? [];
    for (const indexProps of indexes) {
      table.addGlobalSecondaryIndex(indexProps);
    }
    this.tables.set(tableName, table);
  }
}
