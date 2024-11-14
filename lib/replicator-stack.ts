import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';


interface ReplicatorStackProps extends cdk.StackProps {
  srcBucket: s3.Bucket;
  dstBucket: s3.Bucket;
  table: dynamodb.Table;
}

export class ReplicatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ReplicatorStackProps) {
    super(scope, id, props);

    const srcBucket = s3.Bucket.fromBucketName(this, "srcBucket", props.srcBucket.bucketName);
    const dstBucket = s3.Bucket.fromBucketName(this, "dstBucket", props.dstBucket.bucketName);
    const table = dynamodb.Table.fromTableName(this, 'Table', props.table.tableName);

    const replicatorLambda = new lambda.Function(this, 'Replicator', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'replicator.lambda_handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        SRC_BUCKET_NAME: srcBucket.bucketName,
        DST_BUCKET_NAME: dstBucket.bucketName,
        TABLE_NAME: table.tableName,
      },
    });

    srcBucket.grantReadWrite(replicatorLambda);
    dstBucket.grantReadWrite(replicatorLambda);
    dstBucket.grantDelete(replicatorLambda);
    table.grantReadWriteData(replicatorLambda);

    srcBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(replicatorLambda)
    );
    srcBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(replicatorLambda)
    );
  }
}
