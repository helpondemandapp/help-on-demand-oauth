import { Construct } from 'constructs';
import Networks from './Networks';
import LambdaLayers from '../constructs/lambda-layers';
import { aws_ec2 as ec2, aws_iam as iam } from 'aws-cdk-lib';
import LambdaFunction from '../constructs/lambda-function';

type GovCloudGlobalsProps = {
  networks: Networks;
};

export default class GovCloudGlobals extends Construct {
  public readonly lambdaExecutionRole: iam.Role;
  public readonly lambdaLayers: LambdaLayers;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  constructor(scope: Construct, id: string, props: GovCloudGlobalsProps) {
    super(scope, id);

    this.lambdaLayers = new LambdaLayers(this, 'LambdaLayers');

    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      managedPolicies: [LambdaFunction.basicExecutionRoleManagedPolicy(), LambdaFunction.vpcAccessExecutionRole()],
      assumedBy: LambdaFunction.lambdaServicePrincipal(),
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: props.networks.vpc,
      description: 'Security group for Lambda functions that require VPC access',
      allowAllOutbound: true,
    });
  }
}
