import diagnosticsChannel from 'node:diagnostics_channel';
import type { PoolConnectionPromisify } from './types';
import type { RDSClient } from './client';

export default {
  // pool events https://github.com/mysqljs/mysql#pool-events
  connectionNew: diagnosticsChannel.channel('ali-rds:connection:new'),
  connectionAcquire: diagnosticsChannel.channel('ali-rds:connection:acquire'),
  connectionRelease: diagnosticsChannel.channel('ali-rds:connection:release'),
  connectionEnqueue: diagnosticsChannel.channel('ali-rds:connection:enqueue'),
  // query
  queryStart: diagnosticsChannel.channel('ali-rds:query:start'),
  queryEnd: diagnosticsChannel.channel('ali-rds:query:end'),
};

export interface ConnectionMessage {
  client: RDSClient;
  connection: PoolConnectionPromisify;
}

export interface ConnectionEnqueueMessage {
  client: RDSClient;
}

export interface QueryStartMessage {
  connection: PoolConnectionPromisify;
  sql: string;
}

export interface QueryEndMessage {
  connection: PoolConnectionPromisify;
  sql: string;
  error?: Error;
}
