import diagnosticsChannel from 'node:diagnostics_channel';
import type { PoolConnectionPromisify } from './types';
import type { RDSClient } from './client';

export default {
  // pool events https://github.com/mysqljs/mysql#pool-events
  connectionNew: diagnosticsChannel.channel('myrds:connection:new'),
  connectionAcquire: diagnosticsChannel.channel('myrds:connection:acquire'),
  connectionRelease: diagnosticsChannel.channel('myrds:connection:release'),
  connectionEnqueue: diagnosticsChannel.channel('myrds:connection:enqueue'),
  // query
  queryStart: diagnosticsChannel.channel('myrds:query:start'),
  queryEnd: diagnosticsChannel.channel('myrds:query:end'),
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
  duration: number;
  error?: Error;
}
