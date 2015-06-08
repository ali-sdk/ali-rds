/**!
 * ali-rds - lib/client.js
 *
 * Copyright(c) ali-sdk and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const mysql = require('mysql');
const util = require('util');
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
