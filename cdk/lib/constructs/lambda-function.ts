import { Construct } from 'constructs';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Environment, NodeVersionToRuntime } from '../library';
import { Duration } from 'aws-cdk-lib';
import LambdaLayers from './lambda-layers';

const LambdaDefaults = {
  TIMEOUT: Duration.seconds(30),
  MEMORY_SIZE: 512,
  HANDLER: 'index.handler',
} as const;

type LambdaFunctionProps = {
  functionFolder: string;
  timeout?: Duration;
  memorySize?: number;
  role: iam.Role;
  handler?: string;
  environmentVariablesOverride?: Record<string, string>;
  layers: LambdaLayers;
  additionalLayers?: awsLambda.ILayerVersion[];
};

export default class LambdaFunction extends Construct {
  public readonly lambda: awsLambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);
    this.lambda = new awsLambda.Function(this, 'Function', {
      runtime: NodeVersionToRuntime.get(Environment.NODE_VERSION) ?? awsLambda.Runtime.NODEJS_20_X,
      timeout: props.timeout ?? LambdaDefaults.TIMEOUT,
      memorySize: props.memorySize ?? LambdaDefaults.MEMORY_SIZE,
      architecture: awsLambda.Architecture.X86_64,
      role: props.role,
      code: awsLambda.Code.fromAsset(`code/lambda/functions/${props.functionFolder}`),
      handler: props.handler ?? LambdaDefaults.HANDLER,
      environment: {
        ...(props.environmentVariablesOverride ?? {}),
      },
      layers: [props.layers.runtimeLayer, props.layers.commonLayer, ...(props.additionalLayers ?? [])],
    });
  }
}
