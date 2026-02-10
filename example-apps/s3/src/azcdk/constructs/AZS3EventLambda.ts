import { Construct } from 'constructs'
import { CfnOutput, Duration } from 'aws-cdk-lib'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Rule } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { IBucket } from 'aws-cdk-lib/aws-s3'
import * as path from 'path'
import { fileURLToPath } from 'node:url'

export interface AZS3EventLambdaProps {
  bucket: IBucket
}

export class AZS3EventLambda extends Construct {
  public readonly lambdaFunction: NodejsFunction

  constructor(scope: Construct, id: string, props: AZS3EventLambdaProps) {
    super(scope, id)

    // Get the directory of this file in ES module context
    const thisDir = path.dirname(fileURLToPath(import.meta.url))

    // Create Lambda function
    this.lambdaFunction = new NodejsFunction(this, 'S3EventHandler', {
      entry: path.join(thisDir, '../../lambda/s3EventHandler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
      logRetention: RetentionDays.ONE_WEEK,
      bundling: {
        minify: true
      }
    })

    // Grant S3 read permissions
    props.bucket.grantRead(this.lambdaFunction)

    // Grant KMS decrypt permissions if bucket is encrypted
    if (props.bucket.encryptionKey) {
      props.bucket.encryptionKey.grantDecrypt(this.lambdaFunction)
    }

    // Create EventBridge rule for S3 Object Created events
    const rule = new Rule(this, 'S3ObjectCreatedRule', {
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [props.bucket.bucketName]
          }
        }
      }
    })

    // Add Lambda as target
    rule.addTarget(new LambdaFunction(this.lambdaFunction))

    // Export CloudFormation outputs
    new CfnOutput(this, 's3EventLambdaFunctionOutput', {
      key: 's3EventLambdaFunction',
      value: this.lambdaFunction.functionName
    })

    new CfnOutput(this, 's3EventLambdaLogGroupOutput', {
      key: 's3EventLambdaLogGroup',
      value: this.lambdaFunction.logGroup.logGroupName
    })
  }
}
