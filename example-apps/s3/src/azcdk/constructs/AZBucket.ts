import { BlockPublicAccess, Bucket, BucketEncryption, ObjectOwnership } from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { CfnOutput, Duration, RemovalPolicy, Tags } from 'aws-cdk-lib'
import { IKey } from 'aws-cdk-lib/aws-kms'
import { AZStackProps } from '../AZStack.js'

export interface AZBucketProps {
  logicalName: string
  encryptionKey: IKey
  tags: {
    applicationId: string
    dCatalogue: string
    businessUnit: string
  }
}

export class AZBucket extends Bucket {
  constructor(scope: Construct, stackProps: AZStackProps, props: AZBucketProps) {
    super(scope, `${props.logicalName}Bucket`, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      bucketName:
        `${stackProps.appName}-${stackProps.instanceName}-${stackProps.env.account}-${stackProps.env.region}-${props.logicalName}`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'ExpireIncompleteMultipart',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(7)
        }
      ]
    })

    // Guard requires AccessControl: BucketOwnerFullControl alongside
    // ObjectOwnership: BucketOwnerEnforced — use escape hatch since CDK
    // validation may block this combination via L2 props
    // const cfnBucket = this.node.defaultChild as CfnBucket
    // cfnBucket.addPropertyOverride('AccessControl', 'BucketOwnerFullControl')

    Tags.of(this).add('ApplicationId', props.tags.applicationId)
    Tags.of(this).add('dCatalogue', props.tags.dCatalogue)
    Tags.of(this).add('BusinessUnit', props.tags.businessUnit)

    new CfnOutput(this, 'CfnOutput', {
      key: `${props.logicalName}Bucket`,
      value: this.bucketName
    })
  }
}
