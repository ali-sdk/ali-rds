const { promisify } = require('util');
const Operator = require('./operator');

const kWrapToRDS = Symbol('kWrapToRDS');

class RDSConnection extends Operator {
  #conn;
  constructor(conn) {
    super();
    this.#conn = conn;
    if (!this.#conn[kWrapToRDS]) {
      [
        'query',
        'beginTransaction',
        'commit',
        'rollback',
        'locks',
        'lockOne',
        'unlock',
      ].forEach(key => {
        this.#conn[key] = promisify(this.#conn[key]);
      });
      this.#conn[kWrapToRDS] = true;
    }
  }

  release() {
    return this.#conn.release();
  }

  async _query(sql) {
    return await this.#conn.query(sql);
  }

  async beginTransaction() {
    return await this.#conn.beginTransaction();
  }

  async commit() {
    return await this.#conn.commit();
  }

  async rollback() {
    return await this.#conn.rollback();
  }

  async locks(params) {
    return await this.#conn.locks(params);
  }

  async lockOne(tableName, lockType, tableAlias) {
    return await this.#conn.lockOne(tableName, lockType, tableAlias);
  }

  async unlock() {
    return await this.#conn.unlock();
  }
}

module.exports = RDSConnection;
