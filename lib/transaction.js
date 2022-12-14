const Operator = require('./operator');

class RDSTransaction extends Operator {
  #conn;
  isCommit = false;
  isRollback = false;
  constructor(conn) {
    super();
    this.#conn = conn;
  }

  async commit() {
    this.#check();
    try {
      return await this.#conn.commit();
    } finally {
      this.isCommit = true;
      this.#conn.release();
      this.#conn = null;
    }
  }

  async rollback() {
    this.#check();
    try {
      return await this.#conn.rollback();
    } finally {
      this.isRollback = true;
      this.#conn.release();
      this.#conn = null;
    }
  }

  async _query(sql) {
    this.#check();
    return await this.#conn._query(sql);
  }

  #check() {
    if (!this.#conn) {
      throw new Error('transaction was commit or rollback');
    }
  }
}
module.exports = RDSTransaction;
