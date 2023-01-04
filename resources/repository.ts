import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './db';

interface Video {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

export async function listVideos(): Promise<Video[]> {
  const dynamo = getDynamoClient();
  const scanResult = await dynamo.send(new ScanCommand({
    TableName: process.env.VIDEOS_TABLE_NAME
  }))

  if (!scanResult.Items) {
    return []
  }

  return scanResult.Items.map((item) => ({
    id: item.Id.S ?? 'unknown',
    title: item.Title.S ?? 'unknown',
    thumbnailUrl: item.thumbnailUrl?.S ?? ''
  }))
}

export async function createVideo(id: string, title: string): Promise<Video> {
  const dynamo = getDynamoClient();

  await dynamo.send(new PutCommand({
    TableName: process.env.VIDEOS_TABLE_NAME,
    Item: {
      Id: id,
      Title: title
    }
  }))

  return { id, title }
}

export async function updateVideo(id: string, thumbnailUrl: string): Promise<Video> {
  const dynamo = getDynamoClient()

  const result = await dynamo.send(new UpdateCommand({
    ExpressionAttributeValues: {
      ":thumbnailUrl": thumbnailUrl,
    },
    Key: {
      Id: id
    },
    TableName: process.env.VIDEOS_TABLE_NAME,
    UpdateExpression: 'SET thumbnailUrl = :thumbnailUrl',
    ReturnValues: 'ALL_NEW'
  }))

  return {
    id: result.Attributes?.Id,
    title: result.Attributes?.Title,
    thumbnailUrl: result.Attributes?.thumbnailUrl ?? '',
  }
}
