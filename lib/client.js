const { promisify } = require('util');
const mysql = require('mysql');
const Operator = require('./operator');
const RDSConnection = require('./connection');
const RDSTransaction = require('./transaction');
const literals = require('./literals');

class RDSClient extends Operator {
  #pool;
  constructor(options) {
    super();
    this.#pool = mysql.createPool(options);
    [
      'query',
      'getConnection',
    ].forEach(method => {
      this.#pool[method] = promisify(this.#pool[method]);
    });
  }

  // impl Operator._query
  async _query(sql) {
    return await this.#pool.query(sql);
  }

  get pool() {
    return this.#pool;
  }

  get stats() {
    return {
      acquiringConnections: this.#pool._acquiringConnections.length,
      allConnections: this.#pool._allConnections.length,
      freeConnections: this.#pool._freeConnections.length,
      connectionQueue: this.#pool._connectionQueue.length,
    };
  }

  async getConnection() {
    try {
      const conn = await this.#pool.getConnection();
      return new RDSConnection(conn);
    } catch (err) {
      if (err.name === 'Error') {
        err.name = 'RDSClientGetConnectionError';
      }
      throw err;
    }
  }

  /**
   * Begin a transaction
   *
   * @return {Transaction} transaction instance
   */
  async beginTransaction() {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
    } catch (err) {
      conn.release();
      throw err;
    }
    return new RDSTransaction(conn);
  }

  /**
   * Auto commit or rollback on a transaction scope
   *
   * @param {Function} scope - scope with code
   * @param {Object} [ctx] - transaction env context, like koa's ctx.
   *   To make sure only one active transaction on this ctx.
   * @return {Object} - scope return result
   */
  async beginTransactionScope(scope, ctx) {
    ctx = ctx || {};
    if (!ctx._transactionConnection) {
      // Create only one conn if concurrent call `beginTransactionScope`
      ctx._transactionConnection = this.beginTransaction();
    }
    const tran = await ctx._transactionConnection;

    if (!ctx._transactionScopeCount) {
      ctx._transactionScopeCount = 1;
    } else {
      ctx._transactionScopeCount++;
    }
    try {
      const result = await scope(tran);
      ctx._transactionScopeCount--;
      if (ctx._transactionScopeCount === 0) {
        ctx._transactionConnection = null;
        await tran.commit();
      }
      return result;
    } catch (err) {
      if (ctx._transactionConnection) {
        ctx._transactionConnection = null;
        await tran.rollback();
      }
      throw err;
    }
  }

  /**
   * doomed to be rollbacked after transaction scope
   * useful on writing tests which are related with database
   *
   * @param {Function} scope - scope with code
   * @param {Object} [ctx] - transaction env context, like koa's ctx.
   *   To make sure only one active transaction on this ctx.
   * @return {Object} - scope return result
   */
  async beginDoomedTransactionScope(scope, ctx) {
    ctx = ctx || {};
    if (!ctx._transactionConnection) {
      ctx._transactionConnection = await this.beginTransaction();
      ctx._transactionScopeCount = 1;
    } else {
      ctx._transactionScopeCount++;
    }
    const tran = ctx._transactionConnection;
    try {
      const result = await scope(tran);
      ctx._transactionScopeCount--;
      if (ctx._transactionScopeCount === 0) {
        ctx._transactionConnection = null;
      }
      return result;
    } catch (err) {
      if (ctx._transactionConnection) {
        ctx._transactionConnection = null;
      }
      throw err;
    } finally {
      await tran.rollback();
    }
  }

  async end() {
    await this.#pool.end();
  }
}

RDSClient.literals = literals;
RDSClient.escape = mysql.escape;
RDSClient.escapeId = mysql.escapeId;
RDSClient.format = mysql.format;
RDSClient.raw = mysql.raw;
module.exports = RDSClient;
