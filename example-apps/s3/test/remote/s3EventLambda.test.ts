import { expect, test } from 'vitest'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  FilteredLogEvent
} from '@aws-sdk/client-cloudwatch-logs'
import { calculateStackName, getAppInstanceNameFromEnvironment } from '../../src/azcdk/AZApp.js'
import { APP_PROPS } from '../../src/cdk/s3DemoApp.js'

try {
  // Load .env file (this is Node 22+)
  process.loadEnvFile()
} catch {
  // .env file doesn't exist or can't be read, that's okay
}

test('Lambda should be triggered on S3 object upload and log content', async () => {
  const instanceName = getAppInstanceNameFromEnvironment()
  const stackName = calculateStackName(APP_PROPS.appName, APP_PROPS.stackId, instanceName)

  console.log(`Testing stack ${stackName}`)

  // Get CloudFormation outputs
  const cloudformationStacks = await new CloudFormationClient({}).send(
    new DescribeStacksCommand({ StackName: stackName })
  )
  if (!cloudformationStacks.Stacks)
    throw new Error(`Unable to find CloudFormation Stack with name ${stackName}`)

  const outputs = cloudformationStacks.Stacks[0].Outputs
  if (!outputs) throw new Error(`No Outputs for Stack ${stackName}`)

  const bucketNameOutput = outputs.find((output) => output.OutputKey === 'b1Bucket')
  if (!bucketNameOutput) throw new Error(`No Output named b1Bucket on stack ${stackName}`)
  const bucketName = bucketNameOutput.OutputValue
  if (!bucketName) throw new Error(`No Output value on b1Bucket Output on stack ${stackName}`)

  const lambdaFunctionOutput = outputs.find((output) => output.OutputKey === 's3EventLambdaFunction')
  if (!lambdaFunctionOutput) throw new Error(`No Output named s3EventLambdaFunction on stack ${stackName}`)
  const lambdaFunctionName = lambdaFunctionOutput.OutputValue
  if (!lambdaFunctionName)
    throw new Error(`No Output value on s3EventLambdaFunction Output on stack ${stackName}`)

  const logGroupOutput = outputs.find((output) => output.OutputKey === 's3EventLambdaLogGroup')
  if (!logGroupOutput) throw new Error(`No Output named s3EventLambdaLogGroup on stack ${stackName}`)
  const logGroupName = logGroupOutput.OutputValue
  if (!logGroupName) throw new Error(`No Output value on s3EventLambdaLogGroup Output on stack ${stackName}`)

  console.log(`Bucket: ${bucketName}`)
  console.log(`Lambda: ${lambdaFunctionName}`)
  console.log(`Log Group: ${logGroupName}`)

  // Upload a test file to S3
  const s3Client = new S3Client({})
  const testContent = `Test content ${Date.now()}`
  const testKey = `test-${Date.now()}.txt`
  const uploadTime = Date.now()

  console.log(`Uploading test file: ${testKey}`)
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent
    })
  )

  // Poll CloudWatch Logs for the Lambda execution
  const logsClient = new CloudWatchLogsClient({})
  const maxWaitTime = 20000 // 20 seconds
  const pollInterval = 2000 // 2 seconds
  const startTime = Date.now()

  let foundLogs = false
  let logMessages: string[] = []

  while (Date.now() - startTime < maxWaitTime) {
    const response = await logsClient.send(
      new FilterLogEventsCommand({
        logGroupName: logGroupName,
        startTime: uploadTime
      })
    )

    if (response.events && response.events.length > 0) {
      logMessages = response.events
        .map((e: FilteredLogEvent) => e.message || '')
        .filter((m: string) => m.length > 0)

      // Check if logs contain the object key and content
      const hasObjectKey = logMessages.some((msg) => msg.includes(testKey))
      const hasContent = logMessages.some((msg) => msg.includes(testContent))

      if (hasObjectKey && hasContent) {
        foundLogs = true
        console.log('Found expected logs:')
        logMessages.forEach((msg) => console.log(msg))
        break
      }
    }

    console.log(`Waiting for logs... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`)
    await new Promise((resolve) => setTimeout(resolve, pollInterval))
  }

  expect(foundLogs).toBe(true)
  expect(logMessages.some((msg) => msg.includes(testKey))).toBe(true)
  expect(logMessages.some((msg) => msg.includes(testContent))).toBe(true)
}, 30000) // 30 second timeout for the test
