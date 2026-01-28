import { SingleStackAZAppProps } from '../azcdk/AZApp.js'
import { AZStack, AZStackProps } from '../azcdk/AZStack.js'
import { Construct } from 'constructs'
import { AZBucket } from '../azcdk/constructs/AZBucket.js'

export const APP_PROPS: SingleStackAZAppProps = {
  appName: 'S3Demo',
  stackId: 'storage'
}

export class S3DemoStack extends AZStack {
  constructor(scope: Construct, props: AZStackProps) {
    super(scope, props)

    new AZBucket(this, props, { logicalName: 'b1' })
  }
}
