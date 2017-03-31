'use strict';

const util = require('util');
const mysql = require('mysql');
const wrap = require('co-wrap-all');
const Operator = require('./operator');
const RDSConnection = require('./connection');
const RDSTransaction = require('./transaction');

module.exports = RDSClient;
module.exports.literals = require('./literals');

function RDSClient(options) {
  if (!(this instanceof RDSClient)) {
    return new RDSClient(options);
  }
  Operator.call(this);

  this.pool = mysql.createPool(options);
}

util.inherits(RDSClient, Operator);

const proto = RDSClient.prototype;

proto._query = function (sql) {
  let pool = this.pool;
  return function (callback) {
    pool.query(sql, function (err, rows) {
      callback(err, rows);
    });
  };
};

proto.getConnection = function () {
  let pool = this.pool;
  return function (callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        if (err.name === 'Error') {
          err.name = 'RDSClientGetConnectionError';
        }
        return callback(err);
      }
      let conn = new RDSConnection(connection);
      callback(null, conn);
    });
  };
};

/**
 * Begin a transaction
 *
 * @return {Transaction} transaction instance
 */
proto.beginTransaction = function* () {
  let conn = yield this.getConnection();
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
 * @param {Function*} scope
 * @param {Object} [ctx] - transaction env context, like koa's ctx.
 *   To make sure only one active transaction on this ctx.
 * @return {Object} scope return result
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
