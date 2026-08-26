import { Construct } from 'constructs';
import Networks from './Networks';
import LambdaLayers from '../constructs/lambda-layers';
import { aws_ec2 as ec2, aws_iam as iam, aws_secretsmanager as secrets } from 'aws-cdk-lib';
import LambdaFunction from '../constructs/lambda-function';
import DynamoDatabase from './DynamoDatabase';

type GovCloudGlobalsProps = {
  networks: Networks;
};

export default class GovCloudGlobals extends Construct {
  public readonly lambdaExecutionRole: iam.Role;
  public readonly lambdaLayers: LambdaLayers;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly dynamoDb: DynamoDatabase;
  constructor(scope: Construct, id: string, props: GovCloudGlobalsProps) {
    super(scope, id);

    this.dynamoDb = new DynamoDatabase(this, 'DynamoDatabase');

    this.lambdaLayers = new LambdaLayers(this, 'LambdaLayers');

    const accountSecrets = ['db_connection_strings'].map((secret) =>
      secrets.Secret.fromSecretNameV2(this, `Secret-${secret}`, secret)
    );

    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      managedPolicies: [LambdaFunction.basicExecutionRoleManagedPolicy(), LambdaFunction.vpcAccessExecutionRole()],
      assumedBy: LambdaFunction.lambdaServicePrincipal(),
    });
    this.dynamoDb.grantReadWrite(this.lambdaExecutionRole);
    for (const secret of accountSecrets) {
      secret.grantRead(this.lambdaExecutionRole);
    }

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: props.networks.vpc,
      description: 'Security group for Lambda functions that require VPC access',
      allowAllOutbound: true,
    });
  }
}
