import { Context, APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import { createVideo, listVideos } from './repository'

export const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Event', event);
  const { resource, httpMethod } = event;
  if (resource === '/videos' && httpMethod === 'GET') {
    const videos = await listVideos()

    return {
      statusCode: 200,
      body: JSON.stringify({ videos })
    }
  }

  if (resource === '/videos' && httpMethod === 'POST') {
    const dto = JSON.parse(event.body!)

    const video = await createVideo(dto.id, dto.title)

    return {
      statusCode: 201,
      body: JSON.stringify(video)
    }
  }

  return {
    statusCode: 404,
    body: 'NotFound'
  }
}