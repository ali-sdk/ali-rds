'use strict';

const util = require('util');
const mysql = require('mysql');
const co = require('co');
const wrap = require('co-wrap-all');
const Operator = require('./operator');
const RDSConnection = require('./connection');
const RDSTransaction = require('./transaction');
const promisify = require('pify');

module.exports = RDSClient;
module.exports.literals = require('./literals');

function RDSClient(options) {
  if (!(this instanceof RDSClient)) {
    return new RDSClient(options);
  }
  Operator.call(this);

  this.pool = mysql.createPool(options);

  const _hook = options.hook;
  const _getConnection = this.pool.getConnection.bind(this.pool);
  this.pool.getConnection = function(cb) {
    _getConnection(function(err, conn) {
      if (err) return cb(err, null);
      onConnection(conn, function(err) {
        if (err) return cb(err, null);
        onQuery(conn, function(err) {
          if (err) return cb(err, null);
          cb(null, conn);
        });
      });
    });
    function onConnection(conn, cb) {
      if (!_hook || !_hook.onConnection) return cb(null);
      if (conn.__hook_onConnection) return cb(null);
      conn.__hook_onConnection = true;
      co.wrap(_hook.onConnection)(new RDSConnection(conn)).then(function() {
        cb(null);
      }).catch(function(err) {
        cb(err);
      });
    }
    function onQuery(conn, cb) {
      if (!_hook || !_hook.onQuery) return cb(null);
      if (conn.__hook_onQuery) return cb(null);
      conn.__hook_onQuery = true;
      const _query = conn.query;
      conn.query = function query(sql, values, cb) {
        const prevTime = Number(new Date());
        const sequence = _query.call(conn, sql, values, cb);
        const _callback = sequence._callback;
        sequence._callback = function(...args) {
          const ms = Number(new Date()) - prevTime;
          _hook.onQuery(sequence.sql, ms, args);
          _callback(...args);
        };
        return sequence;
      };
      cb(null);
    }
  };

  [
    'query',
    'getConnection',
  ].forEach(method => {
    this.pool[method] = promisify(this.pool[method]);
  });
}

util.inherits(RDSClient, Operator);

const proto = RDSClient.prototype;

proto._query = function(sql) {
  return this.pool.query(sql);
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
proto.beginTransaction = function* () {
  const conn = yield this.getConnection();
  try {
    yield conn.beginTransaction();
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
proto.beginTransactionScope = function* (scope, ctx) {
  ctx = ctx || {};
  if (!ctx._transactionConnection) {
    ctx._transactionConnection = yield this.beginTransaction();
    ctx._transactionScopeCount = 1;
  } else {
    ctx._transactionScopeCount++;
  }
  const tran = ctx._transactionConnection;
  try {
    const result = yield scope(tran);
    ctx._transactionScopeCount--;
    if (ctx._transactionScopeCount === 0) {
      ctx._transactionConnection = null;
      yield tran.commit();
    }
    return result;
  } catch (err) {
    if (ctx._transactionConnection) {
      ctx._transactionConnection = null;
      yield tran.rollback();
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
proto.beginDoomedTransactionScope = function* (scope, ctx) {
  ctx = ctx || {};
  if (!ctx._transactionConnection) {
    ctx._transactionConnection = yield this.beginTransaction();
    ctx._transactionScopeCount = 1;
  } else {
    ctx._transactionScopeCount++;
  }
  const tran = ctx._transactionConnection;
  try {
    const result = yield scope(tran);
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
    yield tran.rollback();
  }
};

proto.end = function(callback) {
  // callback style
  if (callback) {
    return this.pool.end(callback);
  }

  // promise style
  const that = this;
  return new Promise(function(resolve, reject) {
    that.pool.end(function(err) {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

wrap(proto);
