import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as nodejsLambda from 'aws-cdk-lib/aws-lambda-nodejs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions'
import * as iam from 'aws-cdk-lib/aws-iam'

export class ScalabilityStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // FOR THE LAB
    const topic = new sns.Topic(this, 'VideoCreatedTopic')
    
    // FOR THE LAB
    const queue = new sqs.Queue(this, 'VideoCreatedQueue', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // https://bobbyhadz.com/blog/aws-cdk-sns
    topic.addSubscription(new subs.SqsSubscription(queue));

    const bucket = new s3.Bucket(this, 'VideoThumbnails', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      publicReadAccess: true,
    })

    const table = new dynamodb.Table(this, 'VideoTable', {
      partitionKey: { name: 'Id', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const api = new apigateway.RestApi(this, 'videos-api', {
      cloudWatchRole: false,
      restApiName: 'Videos API Service',
      description: 'This service serves videos',
    })

    const videoHandler = new nodejsLambda.NodejsFunction(this, 'VideoHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: 'resources/videos.ts',
      environment: {
        VIDEOS_TABLE_NAME: table.tableName
      },
      role: iam.Role.fromRoleName(this, 'LabRoleVideos', 'LabRole', { mutable: false }),
    })

    // FOR THE LAB
    const videoCreatedHandler = new nodejsLambda.NodejsFunction(this, 'VideoCreatedHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: 'resources/video-created-handler.ts',
      environment: {
        SNS_TOPIC_ARN: topic.topicArn
      },
      role: iam.Role.fromRoleName(this, 'LabRoleVideoCreated', 'LabRole', { mutable: false }),
    })

    // FOR THE LAB
    const thumbnailHandler = new nodejsLambda.NodejsFunction(this, 'ThumbnailHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: 'resources/thumbnails.ts',
      environment: {
        S3_BUCKET_NAME: bucket.bucketName,
        VIDEOS_TABLE_NAME: table.tableName
      },
      timeout: cdk.Duration.seconds(30),
      role: iam.Role.fromRoleName(this, 'LabRoleThumbnailHandler', 'LabRole', { mutable: false }),
    })

    // Do it manually?
    // FOR THE LAB
    videoCreatedHandler.addEventSource(new eventsources.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.LATEST,
      filters: [lambda.FilterCriteria.filter({ eventName: lambda.FilterRule.isEqual('INSERT') })],
      batchSize: 1,
    }))

    // FOR THE LAB
    // https://dev.to/aws-builders/how-to-trigger-an-aws-lambda-from-sqs-2lkc
    thumbnailHandler.addEventSource(new eventsources.SqsEventSource(queue, {
      batchSize: 1,
    }))

    // table.grantReadWriteData(videoHandler)
    // table.grantReadWriteData(thumbnailHandler)
    // bucket.grantReadWrite(thumbnailHandler)
    // topic.grantPublish(videoCreatedHandler)

    const videoResource = api.root.addResource('videos')

    const videoIntegration = new apigateway.LambdaIntegration(videoHandler, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    })

    videoResource.addMethod('GET', videoIntegration)

    const videoItemResource = videoResource.addResource('{id}')
    videoItemResource.addMethod('GET', videoIntegration)

    const videoModel = new apigateway.Model(this, 'post-videos-validator', {
      restApi: api,
      contentType: 'application/json',
      description: 'To validate video create payload',
      modelName: 'videomodelcdk',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        required: ['title'],
        properties: {
          title: { type: apigateway.JsonSchemaType.STRING }
        }
      },
    })

    const requestValidator = new apigateway.RequestValidator(this, 'body-validator', {
      restApi: api,
      requestValidatorName: 'body-validator',
      validateRequestBody: true,
    })

    videoResource.addMethod('POST', videoIntegration, {
      requestValidator,
      requestModels: {
        '$default': videoModel
      },
    })
  }
}
