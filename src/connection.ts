import { promisify } from 'node:util';
import { Operator } from './operator';
import type { PoolConnectionPromisify } from './types';

const kWrapToRDS = Symbol('kWrapToRDS');

export class RDSConnection extends Operator {
  conn: PoolConnectionPromisify;
  constructor(conn: PoolConnectionPromisify) {
    super();
    this.conn = conn;
    if (!this.conn[kWrapToRDS]) {
      [
        'query',
        'beginTransaction',
        'commit',
        'rollback',
      ].forEach(key => {
        this.conn[key] = promisify(this.conn[key]);
      });
      this.conn[kWrapToRDS] = true;
    }
  }

  release() {
    return this.conn.release();
  }

  async _query(sql: string) {
    return await this.conn.query(sql);
  }

  async beginTransaction() {
    return await this.conn.beginTransaction();
  }

  async commit() {
    return await this.conn.commit();
  }

  async rollback() {
    return await this.conn.rollback();
  }
}
