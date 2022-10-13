'use strict';

const util = require('util');
const Operator = require('./operator');
const mysql = require('mysql2');
// const co = require('co');
// const wrap = require('co-wrap-all');
const RDSConnection = require('./connection');
const RDSTransaction = require('./transaction');
// const promisify = require('pify');

module.exports = RDSClient;
module.exports.literals = require('./literals');

function RDSClient(options) {
  if (!(this instanceof RDSClient)) {
    return new RDSClient(options);
  }
  Operator.call(this);

  this.pool = mysql.createPool(options).promise();

  // hook
  const _hook = options.hook;
  // hook: onQuery
  if (_hook && _hook.callback && _hook.callback.onQuery) {
    const _createQuery = mysql.Connection.createQuery;
    mysql.Connection.createQuery = function(sql, values, cb, config) { 
      const prevTime = Number(new Date());
      const query = _createQuery(sql, values, cb, config);
      const _onResult = query.onResult;
      query.onResult = function(err, rows, fields) {
        const ms = Number(new Date()) - prevTime;
        _hook.callback.onQuery(_hook, ms, query, [ rows, fields ]);
        if (_onResult) {
          _onResult(err, rows, fields);
        }
      };
      return query;
    };
  }
  // hook: onConnection
  const self = this;
  const _getConnection = this.pool.pool.getConnection;
  this.pool.pool.getConnection = function(cb) {
    async function onConnection(conn) {
      if (!_hook || !_hook.callback || !_hook.callback.onConnection) return;
      if (conn.__hook_onConnection) return;
      conn.__hook_onConnection = true;
      await _hook.callback.onConnection(new RDSConnection(conn));
    }
    _getConnection.call(self.pool.pool, function(err, conn) {
      if (err) cb(err);
      onConnection(conn).then(() => {
        cb(null, conn);
      }).catch(err => {
        cb(err);
      });
    });
  };

  // [
  //   'query',
  //   'getConnection',
  // ].forEach(method => {
  //   this.pool[method] = promisify(this.pool[method]);
  // });
}

util.inherits(RDSClient, Operator);

const proto = RDSClient.prototype;

proto._query = async function(sql) {
  const result = await this.pool.query(sql);
  return result[0];
};

proto.getConnection = function() {
  return this.pool.getConnection().then(onConnection, onError);
  function onConnection(conn) {
    return new RDSConnection(conn);
  }
  function onError(err) {
    if (err.name === 'Error') {
      err.name = 'RDSClientGetConnectionError';
    }
    throw err;
  }
};

/**
 * Begin a transaction
 *
 * @return {Transaction} transaction instance
 */
proto.beginTransaction = async function() {
  const conn = await this.getConnection();
  try {
    await conn.beginTransaction();
  } catch (err) {
    conn.release();
    throw err;
  }

  return new RDSTransaction(conn);
};

/**
 * Auto commit or rollback on a transaction scope
 *
 * @param {Function} scope - scope with code
 * @param {Object} [ctx] - transaction env context, like koa's ctx.
 *   To make sure only one active transaction on this ctx.
 * @return {Object} - scope return result
 */
proto.beginTransactionScope = async function(scope, ctx) {
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
};

/**
 * doomed to be rollbacked after transaction scope
 * useful on writing test that depend on database
 *
 * @param {Function} scope - scope with code
 * @param {Object} [ctx] - transaction env context, like koa's ctx.
 *   To make sure only one active transaction on this ctx.
 * @return {Object} - scope return result
 */
proto.beginDoomedTransactionScope = async function(scope, ctx) {
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
};

proto.end = function() {
  return this.pool.end();
  // // callback style
  // if (callback) {
  //   return this.pool.end(callback);
  // }

  // // promise style
  // const that = this;
  // return new Promise(function(resolve, reject) {
  //   that.pool.end(function(err) {
  //     if (err) {
  //       return reject(err);
  //     }
  //     resolve();
  //   });
  // });
};

// wrap(proto);
