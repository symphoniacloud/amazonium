import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import { AZStackProps } from '../AZStack.js'

export interface AZBucketProps {
  logicalName: string
}

export class AZBucket extends Bucket {
  constructor(scope: Construct, stackProps: AZStackProps, props: AZBucketProps) {
    // TODO - think about IDs more
    super(scope, `${props.logicalName}Bucket`, {
      // block public access: BlockPublicAccess.BLOCK_ALL and
      // encryption: BucketEncryption.S3_MANAGED are S3 defaults, but
      // this still gives us something to work with in the CloudFormation guards
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      bucketName:
        `${stackProps.appName}-${stackProps.instanceName}-${stackProps.env.account}-${stackProps.env.region}-${props.logicalName}`.toLowerCase(),
      // Bucket won't be destroyed if it has contents
      removalPolicy: RemovalPolicy.DESTROY
    })
    new CfnOutput(this, 'CfnOutput', {
      key: `${props.logicalName}Bucket`,
      value: this.bucketName
    })
  }
}
