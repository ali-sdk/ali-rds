const { promisify } = require('util');
const Operator = require('./operator');

const kWrapToRDS = Symbol('kWrapToRDS');

class RDSConnection extends Operator {
  constructor(conn) {
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

  async _query(sql) {
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

module.exports = RDSConnection;
