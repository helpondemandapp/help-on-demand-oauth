#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { Environment } from '../lib/library';

const app = new cdk.App();
new CdkStack(app, 'CdkStack', {
  env: { account: Environment.AWS_ACCOUNT_ID, region: Environment.AWS_REGION },
  stackName: Environment.STACK_NAME,
});
