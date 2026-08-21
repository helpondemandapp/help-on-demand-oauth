import { Construct } from 'constructs';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Environment, NodeVersionToRuntime } from '../library';
import { Duration } from 'aws-cdk-lib';
import LambdaLayers from './lambda-layers';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import Networks from '../services/Networks';

const LambdaDefaults = {
  TIMEOUT: Duration.seconds(30),
  MEMORY_SIZE: 512,
  HANDLER: 'index.handler',
} as const;

type LambdaFunctionPropsBase = {
  functionFolder: string;
  timeout?: Duration;
  memorySize?: number;
  role: iam.Role;
  handler?: string;
  environmentVariablesOverride?: Record<string, string>;
  layers: LambdaLayers;
  logGroup: logs.LogGroup;
  additionalLayers?: awsLambda.ILayerVersion[];
};

type VPCLambdaProps = LambdaFunctionPropsBase & {
  vpcRequired: true;
  networks: Networks;
  securityGroup: SecurityGroup;
};

type NonVPCLambdaProps = LambdaFunctionPropsBase & {
  vpcRequired?: false;
  networks?: Networks;
  securityGroup?: ec2.SecurityGroup;
};

type LambdaFunctionProps = VPCLambdaProps | NonVPCLambdaProps;

export default class LambdaFunction extends Construct {
  public readonly lambda: awsLambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);
    const securityGroup = props.securityGroup ?? null;
    this.lambda = new awsLambda.Function(this, 'Function', {
      runtime: NodeVersionToRuntime.get(Environment.NODE_VERSION) ?? awsLambda.Runtime.NODEJS_20_X,
      timeout: props.timeout ?? LambdaDefaults.TIMEOUT,
      memorySize: props.memorySize ?? LambdaDefaults.MEMORY_SIZE,
      architecture: awsLambda.Architecture.X86_64,
      role: props.role,
      code: awsLambda.Code.fromAsset(`code/lambda/functions/${props.functionFolder}`),
      handler: props.handler ?? LambdaDefaults.HANDLER,
      ...(props.vpcRequired
        ? {
            vpc: props.networks.vpc,
            vpcSubnets: props.networks.privateSubnets,
          }
        : {}),
      environment: {
        AUTH_DOMAIN: Environment.AUTH_DOMAIN,
        ...(props.environmentVariablesOverride ?? {}),
      },
      ...(securityGroup !== null ? { securityGroups: [securityGroup] } : {}),
      layers: [props.layers.runtimeLayer, props.layers.commonLayer, ...(props.additionalLayers ?? [])],
      logGroup: props.logGroup,
    });
  }

  get functionArn() {
    return this.lambda.functionArn;
  }

  get functionName() {
    return this.lambda.functionName;
  }

  public static basicExecutionRoleManagedPolicy(): iam.IManagedPolicy {
    return iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole');
  }

  public static vpcAccessExecutionRole(): iam.IManagedPolicy {
    return iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole');
  }

  public static lambdaServicePrincipal(): iam.ServicePrincipal {
    return new iam.ServicePrincipal('lambda.amazonaws.com');
  }
}
