import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  StackStatus,
  waitUntilStackCreateComplete,
  waitUntilStackDeleteComplete
} from '@aws-sdk/client-cloudformation'
import { GetBucketEncryptionCommand, S3Client } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { join } from 'path'
import { beforeAll, describe, expect, test } from 'vitest'

const cfnClient = new CloudFormationClient({})
const s3Client = new S3Client({})

async function verifyHooksStackDeployed(): Promise<void> {
  try {
    const result = await cfnClient.send(new DescribeStacksCommand({ StackName: 'amazonium-hooks' }))
    const stack = result.Stacks?.[0]
    if (stack?.StackStatus !== 'CREATE_COMPLETE' && stack?.StackStatus !== 'UPDATE_COMPLETE') {
      throw new Error(`Hooks stack exists but is not ready. Status: ${stack?.StackStatus}`)
    }
  } catch (error) {
    if ((error as Error).message?.includes('does not exist') || (error as Error).name === 'ValidationError') {
      throw new Error(
        'The amazonium-hooks stack must be deployed before running remote tests. Run: npm run deploy'
      )
    }
    throw error
  }
}

interface StackTestResult {
  stackName: string
  success: boolean
  error?: string
}

async function getStackFailureReason(stackName: string): Promise<string> {
  // Get stack events to find the failure reason
  try {
    const eventsResult = await cfnClient.send(new DescribeStackEventsCommand({ StackName: stackName }))

    // Find the first CREATE_FAILED or hook failure event
    const failureEvent = eventsResult.StackEvents?.find(
      (event) =>
        event.ResourceStatus === 'CREATE_FAILED' ||
        event.ResourceStatusReason?.includes('Guard') ||
        event.ResourceStatusReason?.includes('Hook')
    )

    if (failureEvent?.ResourceStatusReason) {
      return failureEvent.ResourceStatusReason
    }

    // Fallback to stack status reason
    const describeResult = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }))
    return describeResult.Stacks?.[0]?.StackStatusReason || 'Unknown error'
  } catch (error) {
    return (error as Error).message || 'Unknown error'
  }
}

async function deployStack(stackName: string, templatePath: string): Promise<StackTestResult> {
  const templateBody = readFileSync(templatePath, 'utf-8')

  try {
    await cfnClient.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody,
        Parameters: [
          {
            ParameterKey: 'StackName',
            ParameterValue: stackName
          }
        ]
      })
    )

    // Wait for stack creation to complete or fail
    const waiterResult = await waitUntilStackCreateComplete(
      {
        client: cfnClient,
        maxWaitTime: 300, // 5 minutes
        minDelay: 5, // Check every 5 seconds
        maxDelay: 10
      },
      { StackName: stackName }
    )

    if (waiterResult.state === 'SUCCESS') {
      return { stackName, success: true }
    } else {
      // Get the detailed failure reason from stack events
      const error = await getStackFailureReason(stackName)
      return {
        stackName,
        success: false,
        error
      }
    }
  } catch {
    // If the stack creation fails, CloudFormation will automatically rollback
    // Get the detailed failure reason from stack events
    const failureReason = await getStackFailureReason(stackName)
    return {
      stackName,
      success: false,
      error: failureReason
    }
  }
}

async function deleteStack(stackName: string): Promise<void> {
  try {
    // Check if stack exists first
    const describeResult = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }))
    const stack = describeResult.Stacks?.[0]

    if (!stack) {
      return // Stack doesn't exist, nothing to delete
    }

    // Don't try to delete if already deleted or being deleted
    if (
      stack.StackStatus === StackStatus.DELETE_COMPLETE ||
      stack.StackStatus === StackStatus.DELETE_IN_PROGRESS
    ) {
      return
    }

    await cfnClient.send(new DeleteStackCommand({ StackName: stackName }))

    // Wait for deletion to complete
    await waitUntilStackDeleteComplete(
      {
        client: cfnClient,
        maxWaitTime: 300, // 5 minutes
        minDelay: 5,
        maxDelay: 10
      },
      { StackName: stackName }
    )
  } catch (error) {
    // If the stack doesn't exist, that's fine
    if (
      (error as Error).message?.includes('does not exist') ||
      (error as Error).name === 'ResourceNotFoundException'
    ) {
      return
    }
    throw error
  }
}

async function getBucketEncryption(bucketName: string): Promise<string | undefined> {
  try {
    const response = await s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }))
    return response.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault
      ?.SSEAlgorithm
  } catch (error) {
    if ((error as Error).name === 'ServerSideEncryptionConfigurationNotFoundError') {
      return undefined
    }
    throw error
  }
}

describe('Guard Hook Remote Integration Tests', () => {
  beforeAll(async () => {
    // Verify the Guard hook is deployed before running tests
    await verifyHooksStackDeployed()
  })

  test('Valid S3 bucket deploys successfully', async () => {
    const timestamp = Date.now().toString().slice(-8) // Last 8 digits for shorter name
    const stackName = `test-amazonium-hooks-v-${timestamp}` // v = valid
    const templatePath = join(__dirname, 'templates', 'valid-bucket.yaml')
    let cleanupError: Error | undefined

    try {
      // Deploy stack with valid template
      const result = await deployStack(stackName, templatePath)

      // Verify deployment succeeded
      expect(result.success).toBe(true)

      // Get the bucket name
      const describeResult = await cfnClient.send(new DescribeStacksCommand({ StackName: stackName }))
      const bucketName = describeResult.Stacks?.[0]?.Outputs?.find(
        (output) => output.OutputKey === 'BucketName'
      )?.OutputValue

      expect(bucketName).toBeDefined()

      // Verify bucket has KMS encryption
      const encryption = await getBucketEncryption(bucketName!)
      expect(encryption).toBe('aws:kms')
    } finally {
      // Clean up
      try {
        await deleteStack(stackName)
      } catch (error) {
        cleanupError = new Error(`Cleanup failed for stack ${stackName}: ${(error as Error).message}`)
      }
    }

    // Fail the test if cleanup failed
    if (cleanupError) {
      throw cleanupError
    }
  })

  test('Invalid S3 bucket deployment is blocked by Guard hook', async () => {
    const timestamp = Date.now().toString().slice(-8) // Last 8 digits for shorter name
    const stackName = `test-amazonium-hooks-i-${timestamp}` // i = invalid
    const templatePath = join(__dirname, 'templates', 'invalid-bucket.yaml')
    let cleanupError: Error | undefined

    try {
      // Attempt to deploy stack with invalid template (no encryption)
      const result = await deployStack(stackName, templatePath)

      // Verify deployment failed
      expect(result.success).toBe(false)

      // Verify error message contains "Guard" or hook type name
      const errorMessage = result.error || ''
      const containsGuardReference =
        errorMessage.toLowerCase().includes('guard') || errorMessage.includes('Amazonium::Guard::S3Resource')

      expect(containsGuardReference).toBe(true)
    } finally {
      // Clean up
      try {
        await deleteStack(stackName)
      } catch (error) {
        cleanupError = new Error(`Cleanup failed for stack ${stackName}: ${(error as Error).message}`)
      }
    }

    // Fail the test if cleanup failed
    if (cleanupError) {
      throw cleanupError
    }
  })
})
