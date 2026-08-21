import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from './library';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class CommercialStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    if (Environment.AWS_PARTITION !== 'commercial') {
      throw new Error(
        `CommercialStack can only be deployed in the commercial partition. Current partition: ${Environment.AWS_PARTITION}`
      );
    }

    // BACKEND_INVOKE_URL is expected to look like: https://<id>.execute-api.<region>.amazonaws.com/<stage>/
    const backendInvokeUrl = new URL(Environment.BACKEND_INVOKE_URL);
    const backendStagePath = backendInvokeUrl.pathname.replace(/\/$/, '');

    const deploymentBucket = new s3.Bucket(this, 'DeploymentBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `access-identity: ${deploymentBucket.bucketName}`,
    });

    deploymentBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        principals: [new iam.CanonicalUserPrincipal(oai.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
        resources: [deploymentBucket.arnForObjects('*')],
      })
    );

    const certificate = acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', Environment.CERT_ARN);

    const spaRewriteFunction = new cloudfront.Function(this, 'SpaRewriteFunction', {
      code: cloudfront.FunctionCode.fromFile({ filePath: 'cloudFrontFunctions/spa-rewrite.js' }),
    });

    const apiRewriteFunction = new cloudfront.Function(this, 'ApiRewriteFunction', {
      code: cloudfront.FunctionCode.fromFile({ filePath: 'cloudFrontFunctions/api-rewrite.js' }),
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(deploymentBucket, {
          originAccessIdentity: oai,
          originShieldEnabled: true,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        functionAssociations: [
          {
            function: spaRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        'api/*': {
          origin: new origins.HttpOrigin(backendInvokeUrl.host, {
            originPath: backendStagePath === '/' ? undefined : backendStagePath,
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          functionAssociations: [
            {
              function: apiRewriteFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
        '.well-known/*': {
          origin: new origins.HttpOrigin(backendInvokeUrl.host, {
            originPath: backendStagePath === '/' ? undefined : backendStagePath,
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      domainNames: [Environment.AUTH_DOMAIN],
      certificate: certificate,
      comment: 'Help on Demand OAuth',
    });

    new cdk.CfnOutput(this, 'DeploymentBucketName', {
      value: deploymentBucket.bucketName,
      key: 'DeploymentBucketName',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      key: 'CloudFrontDistributionId',
    });
  }
}
