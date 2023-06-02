import { AsyncLocalStorage } from 'node:async_hooks';
import { promisify } from 'node:util';
import mysql from 'mysql';
import type { Pool } from 'mysql';
import type { PoolConnectionPromisify, RDSClientOptions, TransactionContext, TransactionScope } from './types';
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

  static #DEFAULT_STORAGE_KEY = Symbol.for('RDSClient#storage#default');
  static #TRANSACTION_NEST_COUNT = Symbol.for('RDSClient#transaction#nestCount');

  #pool: PoolPromisify;
  #connectionStorage: AsyncLocalStorage<TransactionContext>;
  #connectionStorageKey: string | symbol;

  constructor(options: RDSClientOptions) {
    super();
    const { connectionStorage, connectionStorageKey, ...mysqlOptions } = options;
    this.#pool = mysql.createPool(mysqlOptions) as unknown as PoolPromisify;
    [
      'query',
      'getConnection',
      'end',
    ].forEach(method => {
      this.#pool[method] = promisify(this.#pool[method]);
    });
    this.#connectionStorage = connectionStorage || new AsyncLocalStorage();
    this.#connectionStorageKey = connectionStorageKey || RDSClient.#DEFAULT_STORAGE_KEY;
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
    tran[RDSClient.#TRANSACTION_NEST_COUNT] = 1;
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
   * @param {Object} [ctx] - transaction context
   * @return {Object} - scope return result
   */
  async #beginTransactionScope(scope: TransactionScope, ctx: TransactionContext): Promise<any> {
    let tran: RDSTransaction;
    let shouldRelease = false;
    if (!ctx[this.#connectionStorageKey]) {
      // there is no transaction in ctx, create a new one
      tran = await this.beginTransaction();
      ctx[this.#connectionStorageKey] = tran;
      shouldRelease = true;
    } else {
      // use transaction in ctx
      tran = ctx[this.#connectionStorageKey]!;
      tran[RDSClient.#TRANSACTION_NEST_COUNT]++;
    }

    let result: any;
    let scopeError: any;
    let internalError: any;
    try {
      result = await scope(tran);
    } catch (err: any) {
      scopeError = err;
    }
    tran[RDSClient.#TRANSACTION_NEST_COUNT]--;

    // null connection means the nested scope has been rollback, we can do nothing here
    if (tran.conn) {
      try {
        // execution error, should rollback
        if (scopeError) {
          await tran.rollback();
        } else if (tran[RDSClient.#TRANSACTION_NEST_COUNT] < 1) {
          // nestedCount smaller than 1 means all the nested scopes have executed successfully
          await tran.commit();
        }
      } catch (err) {
        internalError = err;
      }
    }

    // remove transaction in ctx
    if (shouldRelease && tran[RDSClient.#TRANSACTION_NEST_COUNT] < 1) {
      ctx[this.#connectionStorageKey] = null;
    }

    if (internalError) {
      if (scopeError) {
        internalError.cause = scopeError;
      }
      throw internalError;
    }
    if (scopeError) {
      throw scopeError;
    }
    return result;
  }

  /**
   * Auto commit or rollback on a transaction scope
   *
   * @param scope - scope with code
   * @return {Object} - scope return result
   */
  async beginTransactionScope(scope: TransactionScope) {
    let ctx = this.#connectionStorage.getStore();
    if (ctx) {
      return await this.#beginTransactionScope(scope, ctx);
    }
    ctx = {};
    return await this.#connectionStorage.run(ctx, async () => {
      return await this.#beginTransactionScope(scope, ctx!);
    });
  }

  /**
   * doomed to be rollbacked after transaction scope
   * useful on writing tests which are related with database
   *
   * @param scope - scope with code
   * @param ctx - transaction context
   * @return {Object} - scope return result
   */
  async #beginDoomedTransactionScope(scope: TransactionScope, ctx: TransactionContext): Promise<any> {
    let tran: RDSTransaction;
    if (!ctx[this.#connectionStorageKey]) {
      // there is no transaction in ctx, create a new one
      tran = await this.beginTransaction();
      ctx[this.#connectionStorageKey] = tran;
    } else {
      // use transaction in ctx
      tran = ctx[this.#connectionStorageKey]!;
      tran[RDSClient.#TRANSACTION_NEST_COUNT]++;
    }

    try {
      const result = await scope(tran);
      tran[RDSClient.#TRANSACTION_NEST_COUNT]--;
      if (tran[RDSClient.#TRANSACTION_NEST_COUNT] === 0) {
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

  /**
   * doomed to be rollbacked after transaction scope
   * useful on writing tests which are related with database
   *
   * @param scope - scope with code
   * @return {Object} - scope return result
   */
  async beginDoomedTransactionScope(scope: TransactionScope): Promise<any> {
    let ctx = this.#connectionStorage.getStore();
    if (ctx) {
      return await this.#beginDoomedTransactionScope(scope, ctx);
    }
    ctx = {};
    return await this.#connectionStorage.run(ctx, async () => {
      return await this.#beginDoomedTransactionScope(scope, ctx!);
    });
  }

  async end() {
    await this.#pool.end();
  }
}
