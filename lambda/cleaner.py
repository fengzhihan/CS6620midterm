import boto3
import os
import time
from datetime import datetime, timedelta


s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

DST_BUCKET_NAME = os.environ['DST_BUCKET_NAME']
TABLE_NAME = os.environ['TABLE_NAME']
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    try:    
        threshold_timestamp = str(int(time.time()) - 10)

        response = table.query(
            IndexName="DisownedTimestampIndex",
            KeyConditionExpression=(
                boto3.dynamodb.conditions.Key('Disowned').eq("true") &
                boto3.dynamodb.conditions.Key('DisownedTimestamp').lte(threshold_timestamp)
            )
        )

        for item in response.get('Items', []):
            copy_key = item['copyName']
            object_key = item['objectName']
            copy_timestamp = item['copyTimestamp']

            # Delete the copy from the destination bucket
            s3.delete_object(Bucket=DST_BUCKET_NAME, Key=copy_key)
            print(f"Deleted disowned copy {copy_key} from {DST_BUCKET_NAME}")

            # Remove the entry from the table
            table.delete_item(Key={'objectName': object_key, 'copyName': copy_key})
            print(f"Removed disowned item from Table T: {copy_key}")
            
    except Exception as e:
        print(f"Error processing disowned items: {e}")
