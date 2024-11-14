import boto3
import os
from datetime import datetime
import time

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')


# Environment variables
SRC_BUCKET_NAME = os.environ['SRC_BUCKET_NAME']
DST_BUCKET_NAME = os.environ['DST_BUCKET_NAME']
TABLE_NAME = os.environ['TABLE_NAME']
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    for record in event.get('Records', []):
        event_name = record['eventName']
        src_key = record['s3']['object']['key']

        if 'ObjectCreated' in event_name:
            dst_key = f"copy-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{src_key}"
            copy_source = {'Bucket': SRC_BUCKET_NAME, 'Key': src_key}
            try:
                s3.copy_object(
                    CopySource=copy_source,
                    Bucket=DST_BUCKET_NAME,
                    Key=dst_key
                )
                print(f"Copied {src_key} to {dst_key} in {DST_BUCKET_NAME}.")

                table.put_item(
                    Item={
                        'objectName': src_key,
                        'copyName': dst_key,
                        'copyTimestamp': datetime.utcnow().isoformat(),
                        'Disowned': 'false',
                        'DisownedTimestamp':'N/A'
                    }
                )
                print(f"Added new copy record to DynamoDB for {dst_key}.")

            except Exception as e:
                print(f"Error replicating {src_key}: {e}")

        elif 'ObjectRemoved' in event_name:
            try:
                # Mark items as disowned when the source object is deleted
                response = table.query(
                    KeyConditionExpression=boto3.dynamodb.conditions.Key('objectName').eq(src_key)
                )
                for item in response.get('Items', []):
                    table.update_item(
                        Key={'objectName': src_key, 'copyName': item['copyName']},
                        UpdateExpression="SET Disowned = :disowned, DisownedTimestamp = :timestamp",
                        ExpressionAttributeValues={
                            ':disowned': 'true',
                            ':timestamp': str(int(time.time()))
                        }
                    )
                    print(f"Marked {item['copyName']} as disowned.")
            except Exception as e:
                print(f"Error processing ObjectRemoved event for {src_key}: {e}")
