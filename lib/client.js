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

var debug = require('debug')('ali-rds:client');
var mysql = require('mysql');
var util = require('util');
var Operator = require('./operator');
var RDSConnection = require('./connection');

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

var proto = RDSClient.prototype;

proto._query = function (sql) {
  var pool = this.pool;
  return function (callback) {
    pool.query(sql, function (err, rows) {
      callback(err, rows);
    });
  };
};

proto.getConnection = function () {
  var pool = this.pool;
  var needFields = this._needFields;
  return function (callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        if (err.name === 'Error') {
          err.name = 'RDSClientGetConnectionError';
        }
        return callback(err);
      }
      var conn = new RDSConnection(connection, needFields);
      callback(null, conn);
    });
  };
};

proto.beginTransaction = function* () {
  var conn = yield this.getConnection();
  try {
    yield conn.beginTransaction();
  } catch (err) {
    conn.release();
    throw err;
  }
  return conn;
};
