/**!
 * ali-rds - lib/connection.js
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

var debug = require('debug')('ali-sdk:ali-rds:connection');
var util = require('util');
var Operator = require('./operator');

module.exports = RDSConnection;

function RDSConnection(conn, needFields) {
  Operator.call(this);
  this.conn = conn;
  this._needFields = needFields;
}
util.inherits(RDSConnection, Operator);

var proto = RDSConnection.prototype;

proto.release = function () {
  this.conn.release();
};

proto._query = function (sql) {
  var conn = this.conn;
  var needFields = this._needFields;
  return function (callback) {
    debug('query %j, needFields: %s', sql, needFields);
    conn.query(sql, function (err, rows, fields) {
      if (needFields) {
        callback(err, { rows: rows, fields: fields });
      } else {
        callback(err, rows);
      }
    });
  };
};

proto.beginTransaction = function () {
  var conn = this.conn;
  return function (callback) {
    conn.beginTransaction(callback);
  };
};

proto.commit = function () {
  var conn = this.conn;
  return function (callback) {
    conn.commit(callback);
  };
};

proto.rollback = function () {
  var conn = this.conn;
  return function (callback) {
    conn.rollback(function () {
      callback();
    });
  };
};
