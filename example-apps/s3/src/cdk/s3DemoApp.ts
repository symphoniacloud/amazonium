import { SingleStackAZAppProps } from '../azcdk/AZApp.js'
import { AZStack, AZStackProps } from '../azcdk/AZStack.js'
import { Construct } from 'constructs'
import { AZBucket } from '../azcdk/constructs/AZBucket.js'
import { AZS3EventLambda } from '../azcdk/constructs/AZS3EventLambda.js'
import { Alias } from 'aws-cdk-lib/aws-kms'

export const APP_PROPS: SingleStackAZAppProps = {
  appName: 'S3Demo',
  stackId: 'storage'
}

export class S3DemoStack extends AZStack {
  constructor(scope: Construct, props: AZStackProps) {
    super(scope, props)

    const bucket = new AZBucket(this, props, {
      logicalName: 'b1',
      encryptionKey: Alias.fromAliasName(this, 'S3KmsKey', 'alias/aws/s3'),
      tags: {
        applicationId: 'S3Demo',
        dCatalogue: 'S3Demo',
        businessUnit: 'engineering'
      }
    })

    // Enable EventBridge notifications
    bucket.enableEventBridgeNotification()

    // Create Lambda function to handle S3 events
    new AZS3EventLambda(this, 'S3EventLambda', {
      bucket: bucket
    })
  }
}
