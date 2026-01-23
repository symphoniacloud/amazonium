import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'

export const DEFAULT_STACK_NAME = 's3-demo'

export class S3DemoStack extends Stack {
  constructor(scope: Construct, props?: StackProps) {
    super(scope, 'S3Demo', props)

    const bucket = new Bucket(this, 'Bucket', {
      // block public access: BlockPublicAccess.BLOCK_ALL and
      // encryption: BucketEncryption.S3_MANAGED are S3 defaults, but
      // this still gives us something to work with in the CloudFormation guards
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      bucketName: `${props?.stackName}-${props?.env?.account}-${props?.env?.region}-bucket`,
      // Bucket won't be destroyed if it has contents
      removalPolicy: RemovalPolicy.DESTROY
    })

    new CfnOutput(this, 'BucketName', {
      value: bucket.bucketName
    })
  }
}
