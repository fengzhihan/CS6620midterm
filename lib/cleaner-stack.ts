import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';


interface CleanerStackProps extends cdk.StackProps {
  dstBucketName: string;
  tableName: string;
  dstBucketArn: string;
  tableArn: string;
}

export class CleanerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CleanerStackProps) {
    super(scope, id, props);

    const { dstBucketName, tableName } = props;

    const cleanerLambda = new lambda.Function(this, 'Cleaner', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'cleaner.lambda_handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        DST_BUCKET_NAME: dstBucketName,
        TABLE_NAME: tableName,
      },
      timeout: cdk.Duration.minutes(1),
    });

    cleanerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:DeleteObject'],
        effect: iam.Effect.ALLOW,
        resources: [props.dstBucketArn, props.dstBucketArn+'/*'],
      })
    );
    cleanerLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem'],
        effect: iam.Effect.ALLOW,
        resources: [props.tableArn, props.tableArn+'/*'],
      })
    );

    new events.Rule(this, 'CleanerSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(cleanerLambda)],
    });
  }
}
