import type { RDSConnection } from './connection';
import { Operator } from './operator';

export class RDSTransaction extends Operator {
  isCommit = false;
  isRollback = false;
  conn: RDSConnection | null;
  constructor(conn: RDSConnection) {
    super();
    this.conn = conn;
  }

  async commit() {
    this.#check();
    try {
      return await this.conn!.commit();
    } finally {
      this.isCommit = true;
      this.conn!.release();
      this.conn = null;
    }
  }

  async rollback() {
    this.#check();
    try {
      return await this.conn!.rollback();
    } finally {
      this.isRollback = true;
      this.conn!.release();
      this.conn = null;
    }
  }

  protected async _query(sql: string) {
    this.#check();
    return await this.conn!._query(sql);
  }

  #check() {
    if (!this.conn) {
      throw new Error('transaction was commit or rollback');
    }
  }
}
