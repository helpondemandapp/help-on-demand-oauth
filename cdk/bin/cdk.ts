#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GovCloudStack } from '../lib/gov-cloud-stack';
import { Environment } from '../lib/library';
import { CommercialStack } from '../lib/commercial-stack';

const app = new cdk.App();
if (Environment.AWS_PARTITION === 'gov-cloud') {
  new GovCloudStack(app, 'CdkStack', {
    env: { account: Environment.AWS_ACCOUNT_ID, region: Environment.AWS_REGION },
    stackName: Environment.STACK_NAME,
  });
}
if (Environment.AWS_PARTITION === 'commercial') {
  new CommercialStack(app, 'CdkStack', {
    env: { account: Environment.AWS_ACCOUNT_ID, region: Environment.AWS_REGION },
    stackName: Environment.STACK_NAME,
  });
}
