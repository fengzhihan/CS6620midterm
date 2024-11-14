import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { ReplicatorStack } from '../lib/replicator-stack';
import { CleanerStack } from '../lib/cleaner-stack';


const app = new cdk.App();
const storageStack = new StorageStack(app, 'StorageStack', {});
new ReplicatorStack(app, 'ReplicatorStack', {
  srcBucket: storageStack.bucketSrc,
  dstBucket: storageStack.bucketDst,
  table: storageStack.tableT,
});
new CleanerStack(app, 'CleanerStack', {
  dstBucketName: storageStack.bucketDst.bucketName,
  tableName: storageStack.tableT.tableName,
  dstBucketArn: storageStack.bucketDst.bucketArn,
  tableArn: storageStack.tableT.tableArn
});