import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export const DEFAULT_STACK_NAME = 's3-demo'

export class S3DemoStack extends Stack {
  constructor(scope: Construct, props?: StackProps) {
    super(scope, 'S3Demo', props)

    const bucket = new Bucket(this, 'Bucket', {
      // Used just for demo / testing, for now
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnOutput(this, 'BucketName', {
      value: bucket.bucketName
    })
  }
}
