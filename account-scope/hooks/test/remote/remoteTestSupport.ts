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
import { readFileSync } from 'fs'

export interface StackTestResult {
  stackName: string
  // success if this field is undefined otherwise error
  error?: string
}

export async function deployStack(
  cfnClient: CloudFormationClient,
  stackName: string,
  templatePath: string
): Promise<StackTestResult> {
  const templateBody = readFileSync(templatePath, 'utf-8')

  try {
    await cfnClient.send(
      new CreateStackCommand({
        StackName: stackName,
        TemplateBody: templateBody
      })
    )

    const waiterResult = await waitUntilStackCreateComplete(
      {
        client: cfnClient,
        maxWaitTime: 300, // 5 minutes
        minDelay: 5, // Check every 5 seconds
        maxDelay: 10
      },
      { StackName: stackName }
    )

    return {
      stackName,
      error: waiterResult.state === 'SUCCESS' ? undefined : await getStackFailureReason(cfnClient, stackName)
    }
  } catch {
    return {
      stackName,
      error: await getStackFailureReason(cfnClient, stackName)
    }
  }
}

export async function cleanupStack(cfnClient: CloudFormationClient, stackName: string): Promise<void> {
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
    throw new Error(`Cleanup failed for stack ${stackName}: ${(error as Error).message}`)
  }
}

async function getStackFailureReason(cfnClient: CloudFormationClient, stackName: string): Promise<string> {
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
