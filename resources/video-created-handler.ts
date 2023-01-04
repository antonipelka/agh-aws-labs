import { DynamoDBStreamEvent, Handler } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb';

const sns = new SNSClient({})

const lambdaId = randomUUID()

// FOR THE LAB
export const handler: Handler<DynamoDBStreamEvent, void | string> = async (event) => {
  console.log(
    'Event',
    lambdaId,
    event,
  )

  await sns.send(new PublishCommand({
    Message: JSON.stringify(unmarshall(event.Records[0].dynamodb?.NewImage as Record<string, AttributeValue>)),
    TopicArn: process.env.SNS_TOPIC_ARN,
  }))
}