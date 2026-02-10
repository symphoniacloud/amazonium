import { EventBridgeEvent } from 'aws-lambda'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({})

interface S3ObjectCreatedDetail {
  bucket: {
    name: string
  }
  object: {
    key: string
  }
}

export const handler = async (
  event: EventBridgeEvent<'Object Created', S3ObjectCreatedDetail>
): Promise<void> => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2))

  const bucketName = event.detail.bucket.name
  const objectKey = event.detail.object.key

  console.log(`Processing object: ${objectKey} from bucket: ${bucketName}`)

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      console.log('Object has no body')
      return
    }

    const content = await response.Body.transformToString()
    console.log(`Object key: ${objectKey}`)
    console.log(`Object content: ${content}`)
  } catch (error) {
    console.error('Error reading S3 object:', error)
    throw error
  }
}
