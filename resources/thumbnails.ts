import { Upload } from '@aws-sdk/lib-storage';
import { Handler, SQSEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { updateVideo } from './repository';
import { getS3Client } from './s3';
import nodeFetch from 'node-fetch'

const lambdaId = randomUUID()

const uploadItemToS3 = async (body: Blob, key: string): Promise<string> => {
  const upload = new Upload({
    client: getS3Client(),
    params: {
      Body: body,
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    }
  })

  await upload.done();

  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

const importThumbnail = async (id: string): Promise<string> => {
  const url = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

  const fetchResult = await nodeFetch(url);
  const fileContent = await fetchResult.blob();

  return uploadItemToS3(fileContent, `${id}.jpg`)
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// FOR THE LAB
export const handler: Handler<SQSEvent, void | string> = async (event) => {
  console.log('Event', lambdaId, event)
  await delay(15000)

  const snsEvent = JSON.parse(event.Records[0].body)

  const { Id } = JSON.parse(snsEvent.Message)

  const uploadedUrl = await importThumbnail(Id)

  await updateVideo(Id, uploadedUrl)

  console.log('Updated thumbnail', Id)
}