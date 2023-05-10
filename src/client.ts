import { promisify } from 'node:util';
import mysql from 'mysql';
import type { PoolConfig, Pool } from 'mysql';
import type { PoolConnectionPromisify } from './types';
import { Operator } from './operator';
import { RDSConnection } from './connection';
import { RDSTransaction } from './transaction';
import literals from './literals';

interface PoolPromisify extends Omit<Pool, 'query'> {
  query(sql: string): Promise<any>;
  getConnection(): Promise<PoolConnectionPromisify>;
  end(): Promise<void>;
  _acquiringConnections: any[];
  _allConnections: any[];
  _freeConnections: any[];
  _connectionQueue: any[];
}

export class RDSClient extends Operator {
  static get literals() { return literals; }
  static get escape() { return mysql.escape; }
  static get escapeId() { return mysql.escapeId; }
  static get format() { return mysql.format; }
  static get raw() { return mysql.raw; }

  #pool: PoolPromisify;
  constructor(options: PoolConfig) {
    super();
    this.#pool = mysql.createPool(options) as unknown as PoolPromisify;
    [
      'query',
      'getConnection',
      'end',
    ].forEach(method => {
      this.#pool[method] = promisify(this.#pool[method]);
    });
  }

  // impl Operator._query
  protected async _query(sql: string) {
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
      const _conn = await this.#pool.getConnection();
      const conn = new RDSConnection(_conn);
      if (this.beforeQueryHandlers.length > 0) {
        for (const handler of this.beforeQueryHandlers) {
          conn.beforeQuery(handler);
        }
      }
      if (this.afterQueryHandlers.length > 0) {
        for (const handler of this.afterQueryHandlers) {
          conn.afterQuery(handler);
        }
      }
      return conn;
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
   * @return {RDSTransaction} transaction instance
   */
  async beginTransaction(): Promise<RDSTransaction> {
    const conn = await this.getConnection();
    try {
      await conn.beginTransaction();
    } catch (err) {
      conn.release();
      throw err;
    }
    const tran = new RDSTransaction(conn);
    if (this.beforeQueryHandlers.length > 0) {
      for (const handler of this.beforeQueryHandlers) {
        tran.beforeQuery(handler);
      }
    }
    if (this.afterQueryHandlers.length > 0) {
      for (const handler of this.afterQueryHandlers) {
        tran.afterQuery(handler);
      }
    }
    return tran;
  }

  /**
   * Auto commit or rollback on a transaction scope
   *
   * @param {Function} scope - scope with code
   * @param {Object} [ctx] - transaction env context, like koa's ctx.
   *   To make sure only one active transaction on this ctx.
   * @return {Object} - scope return result
   */
  async beginTransactionScope(scope: (transaction: RDSTransaction) => Promise<any>, ctx?: any): Promise<any> {
    ctx = ctx || {};
    if (!ctx._transactionConnection) {
      // Create only one conn if concurrent call `beginTransactionScope`
      ctx._transactionConnection = await this.beginTransaction();
    }
    const tran = ctx._transactionConnection;

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
  async beginDoomedTransactionScope(scope: (transaction: RDSTransaction) => Promise<any>, ctx?: any): Promise<any> {
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
