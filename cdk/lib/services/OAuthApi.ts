import { Construct } from 'constructs';
import Networks from './Networks';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import GovCloudGlobals from './GovCloudGlobals';
import { Duration } from 'aws-cdk-lib';
import * as awsLambda from 'aws-cdk-lib/aws-lambda';
import * as awsLogs from 'aws-cdk-lib/aws-logs';
import LambdaFunction from '../constructs/lambda-function';
import { Environment, EnvironmentConfig } from '../library';

type OAuthApiProps = {
  networks: Networks;
  globals: GovCloudGlobals;
};

type ApiResourceProps = OAuthApiProps & {
  path: string;
  methods: [string, ...string[]];
  parentResource: apiGateway.IResource;
  lambdaFunction: {
    functionFolder: string;
    timeout?: Duration;
    memorySize?: number;
    environmentVariablesOverride?: Record<string, string>;
    additionalLayers?: awsLambda.ILayerVersion[];
  };
  vpcRequired?: boolean;
  isProxy?: boolean;
};

export class OAuthApi extends Construct {
  public readonly api: apiGateway.RestApi;
  private readonly apiLogGroup: awsLogs.LogGroup;
  constructor(scope: Construct, id: string, props: OAuthApiProps) {
    super(scope, id);

    this.api = new apiGateway.RestApi(this, 'OAuthApi', {
      endpointTypes: [apiGateway.EndpointType.REGIONAL], // GovCloud APIs must explicitly set the endpoint type to REGIONAL
      deployOptions: { stageName: 'prod' },
      description: 'OAuth API for handling generating tokens for external/internal connections to Help on Demand',
    });
    const apiResource = this.api.root.addResource('api');

    this.apiLogGroup = new awsLogs.LogGroup(this, `ApiLogGroup`, {
      logGroupName: `${Environment.STACK_NAME}/lambda/oauth-api/api-handler`,
      retention: EnvironmentConfig.lambdaLogRetentionDays,
    });

    this.addResource({
      parentResource: this.api.root,
      path: '.well-known',
      isProxy: true,
      methods: ['GET'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/well-known',
      },
    });

    this.addResource({
      parentResource: apiResource,
      path: 'register',
      methods: ['POST'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/register',
      },
    });

    this.addResource({
      parentResource: apiResource,
      path: 'authorize',
      methods: ['GET'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/authorize',
      },
    });

    this.addResource({
      parentResource: apiResource,
      path: 'authenticate',
      methods: ['POST'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/authenticate',
      },
    });

    this.addResource({
      parentResource: apiResource,
      path: 'consent',
      methods: ['GET', 'POST'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/consent',
      },
    });

    this.addResource({
      parentResource: apiResource,
      path: 'consent-request',
      methods: ['GET'],
      networks: props.networks,
      globals: props.globals,
      lambdaFunction: {
        functionFolder: 'oauth-api/consent-request',
      },
    });
  }

  private addResource(props: ApiResourceProps) {
    if (props.path.trim().length === 0) {
      throw new Error('API resource path cannot be empty');
    }
    if (props.path.includes('/')) {
      throw new Error('API resource path cannot contain slashes');
    }
    if (props.path === '.') {
      throw new Error('API resource path cannot be "."');
    }

    const normalizedPath = props.path.trim().replaceAll(/\./g, '');
    const resourceId = normalizedPath.charAt(0).toUpperCase() + normalizedPath.slice(1);

    const construct = new Construct(this, resourceId);
    const resources = [props.parentResource.addResource(props.path)];
    if (props.isProxy) {
      resources.push(resources[0]!.addResource('{proxy+}'));
    }
    const lambdaPropsBase = {
      ...props.lambdaFunction,
      layers: props.globals.lambdaLayers,
      role: props.globals.lambdaExecutionRole,
      logGroup: this.apiLogGroup,
    };
    const lambdaProps =
      props.vpcRequired === true
        ? {
            ...lambdaPropsBase,
            vpcRequired: true as const,
            securityGroup: props.globals.lambdaSecurityGroup,
            networks: props.networks,
          }
        : lambdaPropsBase;
    const lambda = new LambdaFunction(construct, `Lambda`, lambdaProps);
    for (const method of props.methods) {
      for (const resource of resources) {
        resource.addMethod(method, new apiGateway.LambdaIntegration(lambda.lambda));
      }
    }
  }

  public get apiUrl(): string {
    return this.api.url;
  }
}
