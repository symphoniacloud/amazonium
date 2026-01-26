import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { join } from 'path'
import { beforeAll, describe, expect, test } from 'vitest'
import { DEFAULT_STACK_NAME } from '../../src/cdk/HooksStack.js'
import { cleanupStack, deployStack } from './remoteTestSupport.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

try {
  // Load .env file (this is Node 22+)
  process.loadEnvFile()
} catch {
  // .env file doesn't exist or can't be read, that's okay
}

const HOOKS_STACK_NAME = process.env.STACK_NAME || DEFAULT_STACK_NAME
const cfnClient = new CloudFormationClient({})

async function verifyHooksStackDeployed(): Promise<void> {
  try {
    const result = await cfnClient.send(new DescribeStacksCommand({ StackName: HOOKS_STACK_NAME }))
    const stack = result.Stacks?.[0]
    if (stack?.StackStatus !== 'CREATE_COMPLETE' && stack?.StackStatus !== 'UPDATE_COMPLETE') {
      throw new Error(`Hooks stack exists but is not ready. Status: ${stack?.StackStatus}`)
    }
  } catch (error) {
    if ((error as Error).message?.includes('does not exist') || (error as Error).name === 'ValidationError') {
      throw new Error(
        `The ${HOOKS_STACK_NAME} stack must be deployed before running remote tests. Run: npm run deploy`
      )
    }
    throw error
  }
}

function pathOfTemplate(templateFileName: string) {
  return join(path.dirname(fileURLToPath(import.meta.url)), 'templates', templateFileName)
}

function createTestStackName(isValidStack: boolean) {
  // Use last 3 digits of timestamp for some test isolation
  const suffix = Date.now().toString().slice(-3)
  return `t-${HOOKS_STACK_NAME}-${isValidStack ? 'v' : 'i'}-${suffix}`
}

describe('Guard Hook Remote Integration Tests', () => {
  beforeAll(async () => {
    // Verify the Guard hook is deployed before running tests
    await verifyHooksStackDeployed()
  })

  test('Valid S3 bucket deploys successfully', async () => {
    const stackName = createTestStackName(true)

    try {
      const result = await deployStack(cfnClient, stackName, pathOfTemplate('valid-bucket.yaml'))
      expect(result.error).toBeUndefined()

      // Double check - make sure bucketname output is available and correct
      const describeResult = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }))
      const bucketName = describeResult.Stacks?.[0]?.Outputs?.find(
        (output) => output.OutputKey === 'BucketName'
      )?.OutputValue
      expect(bucketName).toBeDefined()
    } finally {
      // if this fails it will throw and test will fail - that's OK
      await cleanupStack(cfnClient, stackName)
    }
  })

  test('Invalid S3 bucket deployment is blocked by Guard hook', async () => {
    const stackName = createTestStackName(false)

    try {
      const result = await deployStack(cfnClient, stackName, pathOfTemplate('invalid-bucket.yaml'))
      expect(result.error).toBeDefined()

      // Verify failed for correct reason - should be something like "The following hook(s) failed: [Amazonium::Guard::S3Resource]"
      const errorMessage = result.error ?? ''
      expect(errorMessage.includes('The following hook(s) failed:')).toBeTruthy()
      expect(errorMessage.includes('Guard::S3Resource')).toBeTruthy()
    } finally {
      // if this fails it will throw and test will fail - that's OK
      await cleanupStack(cfnClient, stackName)
    }
  })
})
