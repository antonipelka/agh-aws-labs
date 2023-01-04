import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export function getDynamoClient() {
  const dbClient = new DynamoDBClient({});

  return DynamoDBDocumentClient.from(dbClient)
}