import { CfnGuardHook, Stack } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { HookFailureMode } from '@aws-sdk/client-cloudformation'
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { Asset } from 'aws-cdk-lib/aws-s3-assets'
import path from 'node:path'
import { StackPropsWithAccountRegionAndStackName } from './initSupport.js'
import { kebabCaseToPascalCase } from '../shared/stringUtils.js'
import { fileURLToPath } from 'node:url'

export const DEFAULT_STACK_NAME = 'amazonium-hooks'

export class HooksStack extends Stack {
  constructor(scope: Construct, props: StackPropsWithAccountRegionAndStackName) {
    super(scope, 'HooksStack', props)
    defineGuardHooks(this, props)
  }
}

export function defineGuardHooks(scope: Construct, props: StackPropsWithAccountRegionAndStackName) {
  const guardHookRole = new Role(scope, 'GuardHookRole', {
    assumedBy: new ServicePrincipal('hooks.cloudformation.amazonaws.com')
  })

  const stackFilterInclude = [`t-${props.stackName}*`, ...(props.stackName === DEFAULT_STACK_NAME ? ['s3-demo*'] : [])]
  const stackFilterExclude = [`${props.stackName}*`]

  defineResourceGuardHook(
    scope,
    'S3EncryptionHook',
    's3-resource',
    guardHookRole,
    stackFilterInclude,
    stackFilterExclude,
    ['AWS::S3::Bucket'],
    props
  )
}

export function defineResourceGuardHook(
  scope: Construct,
  id: string,
  guardName: string,
  role: Role,
  stackFilterInclude: string[],
  stackFilterExclude: string[],
  targetNames: string[],
  props: StackPropsWithAccountRegionAndStackName
) {
  // Might want to eventually more explicitly manage this
  // but for now this is a way of easily deploying s3 content
  const guardFileAsset = new Asset(scope, `${id}Asset`, {
    path: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      `../guard/resource-scope/${guardName}.guard`
    )
  })
  guardFileAsset.grantRead(role)

  // Aliases have to be unique across the account, so make it based on Stack name
  const hookAlias = `${props.stackName === DEFAULT_STACK_NAME ? 'Amazonium' : `${kebabCaseToPascalCase(props.stackName)}`}::Guard::${kebabCaseToPascalCase(guardName)}`
  // Eventually consider adding logging
  const hook = new CfnGuardHook(scope, id, {
    alias: hookAlias,
    executionRole: role.roleArn,
    failureMode: HookFailureMode.FAIL,
    hookStatus: 'ENABLED',
    ruleLocation: {
      uri: guardFileAsset.s3ObjectUrl
    },
    // Eventually consider filtering this by role
    stackFilters: {
      filteringCriteria: 'ALL',
      stackNames: {
        include: stackFilterInclude,
        exclude: stackFilterExclude
      }
    },
    targetOperations: ['RESOURCE'],
    targetFilters: {
      actions: ['CREATE', 'UPDATE'],
      invocationPoints: ['PRE_PROVISION'],
      targetNames,
      targets: []
    }
  })
  // To work around Bug in CDK - see https://github.com/aws/aws-cdk/issues/34591
  hook.addPropertyDeletionOverride('TargetFilters.Targets')
}
