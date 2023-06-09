import MySQLPoolConfig from 'mysql/lib/PoolConfig';
import type { PoolConfig, ConnectionConfig } from 'mysql';
import type { GetConnectionConfig } from './types';

export class RDSPoolConfig extends MySQLPoolConfig {
  #getConnectionConfig: GetConnectionConfig;

  constructor(options: PoolConfig, getConnectionConfig: GetConnectionConfig) {
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
