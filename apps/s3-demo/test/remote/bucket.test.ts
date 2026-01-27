import { expect, test } from 'vitest'
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation'
import { DEFAULT_STACK_NAME } from '../../src/cdk/S3DemoStack.js'
import { GetBucketEncryptionCommand, S3Client } from '@aws-sdk/client-s3'
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'

try {
  // Load .env file (this is Node 22+)
  process.loadEnvFile()
} catch {
  // .env file doesn't exist or can't be read, that's okay
}

test('Bucket should exist with correct encryption', async () => {
  const stackName = process.env['STACK_NAME'] || DEFAULT_STACK_NAME

  console.log(`Testing stack ${stackName}`)

  const cloudformationStacks = await new CloudFormationClient({}).send(
    new DescribeStacksCommand({ StackName: stackName })
  )
  if (!cloudformationStacks.Stacks)
    throw new Error(`Unable to find CloudFormation Stack with name ${stackName}`)

  const outputs = cloudformationStacks.Stacks[0].Outputs
  if (!outputs) throw new Error(`No Outputs for Stack ${stackName}`)

  const bucketNameOutput = outputs.find((output) => output.OutputKey === 'BucketName')
  if (!bucketNameOutput) throw new Error(`No Output named BucketName on stack ${stackName}`)

  const bucketName = bucketNameOutput.OutputValue
  if (!bucketName) throw new Error(`No Output value on BucketName Output on stack ${stackName}`)

  const s3Client = new S3Client({})

  const accountId = (await new STSClient({}).send(new GetCallerIdentityCommand({}))).Account
  const region = await s3Client.config.region()

  expect(bucketName).toEqual(`${stackName}-${accountId}-${region}-b1`)

  const bucketEncryption = await s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }))
  expect(bucketEncryption.ServerSideEncryptionConfiguration).toEqual({
    Rules: [
      {
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: 'AES256'
        },
        BucketKeyEnabled: false
      }
    ]
  })
})
