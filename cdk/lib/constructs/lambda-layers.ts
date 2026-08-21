import { Construct } from 'constructs';
import { Environment, NodeVersionToRuntime } from '../library';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';

export default class LambdaLayers extends Construct {
  public readonly runtimeLayer: awsLambda.LayerVersion;
  public readonly commonLayer: awsLambda.LayerVersion;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const runtime = NodeVersionToRuntime.get(Environment.NODE_VERSION) ?? awsLambda.Runtime.NODEJS_20_X;
    const layerPrefix = `${Environment.STACK_NAME}-nodejs-${Environment.NODE_VERSION}`.trim().toLowerCase();
    this.runtimeLayer = new awsLambda.LayerVersion(this, 'RuntimeDependencies', {
      layerVersionName: `${layerPrefix}-runtime-dependencies`,
      description: 'Runtime dependencies for the Lambda functions',
      code: awsLambda.Code.fromAsset('code/lambda/functions/runtime-deps'),
      compatibleRuntimes: [runtime],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.commonLayer = new awsLambda.LayerVersion(this, 'Common', {
      layerVersionName: `${layerPrefix}-common`,
      description: 'Common code the Lambda functions',
      code: awsLambda.Code.fromAsset('code/lambda/common'),
      compatibleRuntimes: [runtime],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
