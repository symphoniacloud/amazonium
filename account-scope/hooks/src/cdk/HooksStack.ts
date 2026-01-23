import { CfnGuardHook, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { HookFailureMode } from '@aws-sdk/client-cloudformation'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import path from 'node:path'

export const DEFAULT_STACK_NAME = 'amazonium-hooks'

export class HooksStack extends Stack {
  constructor(scope: Construct, props?: StackProps) {
    super(scope, 'S3Demo', props)

    // Might want to eventually more explicitly manage this
    // but for now this is a way of easily deploying s3 content
    const s3ResourceGuardAsset = new Asset(this, 'S3ResourceGuard', {
      path: path.join(__dirname, '../guard/resource-scope/s3-resource.guard')
    })
    const hookRole = new Role(this, 'HookRole', {
      assumedBy: new ServicePrincipal('hooks.cloudformation.amazonaws.com')
    })
    s3ResourceGuardAsset.grantRead(hookRole)

    const s3ResourceHook = new CfnGuardHook(this, 'S3EncryptionHook', {
      alias: 'Amazonium::Guard::S3Resource',
      executionRole: hookRole.roleArn,
      failureMode: HookFailureMode.FAIL,
      hookStatus: 'ENABLED',
      ruleLocation: {
        uri: s3ResourceGuardAsset.s3ObjectUrl
      },
      // Eventually consider filtering this by role
      stackFilters: {
        filteringCriteria: 'ALL',
        stackNames: {
          include: ['s3-demo*', 'test-amazonium-hooks*'],
          exclude: ['amazonium-hooks*']
        }
      },
      targetOperations: ['RESOURCE'],
      targetFilters: {
        actions: ['CREATE', 'UPDATE'],
        invocationPoints: ['PRE_PROVISION'],
        targetNames: ['AWS::S3::Bucket'],
        targets: []
      }
      // logBucket
      // options
    })
    // To work around Bug in CDK - see https://github.com/aws/aws-cdk/issues/34591
    s3ResourceHook.addPropertyDeletionOverride('TargetFilters.Targets')
  }
}
