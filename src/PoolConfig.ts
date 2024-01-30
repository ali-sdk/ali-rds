import MySQLPoolConfig from 'mysql/lib/PoolConfig';
import type { PoolOptions, ConnectionConfig } from 'mysql2';
import type { GetConnectionConfig } from './types';

export class RDSPoolConfig extends MySQLPoolConfig {
  #getConnectionConfig: GetConnectionConfig;

  constructor(options: PoolOptions, getConnectionConfig: GetConnectionConfig) {
    super(options);
    this.#getConnectionConfig = getConnectionConfig;
  }

  newConnectionConfig(): ConnectionConfig {
    return {
      ...super.newConnectionConfig(),
      ...this.#getConnectionConfig(),
    };
  }
}
