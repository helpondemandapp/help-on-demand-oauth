import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from './library';
import Networks from './services/Networks';
import GovCloudGlobals from './services/GovCloudGlobals';
import { OAuthApi } from './services/OAuthApi';

export class GovCloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    if (Environment.AWS_PARTITION !== 'gov-cloud') {
      throw new Error(
        `GovCloudStack can only be deployed in the gov-cloud partition. Current partition: ${Environment.AWS_PARTITION}`
      );
    }

    const networks = new Networks(this, 'Networks', {
      vpcId: Environment.VPC_ID,
      privateSubnetIds: Environment.PRIVATE_SUBNET_IDS as [string, string, string][],
    });

    const globals = new GovCloudGlobals(this, 'Globals', {
      networks: networks,
    });

    const api = new OAuthApi(this, 'OAuthApi', {
      globals: globals,
      networks: networks,
    });

    new cdk.CfnOutput(this, 'UrlOutput', {
      key: 'OAuthApiUrl',
      value: api.apiUrl,
    });
  }
}
