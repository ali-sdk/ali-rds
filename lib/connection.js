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

var util = require('util');
var Operator = require('./operator');

module.exports = RDSConnection;

function RDSConnection(conn) {
  Operator.call(this);
  this.conn = conn;
}
util.inherits(RDSConnection, Operator);

var proto = RDSConnection.prototype;

proto.release = function () {
  this.conn.release();
};

proto._query = function (sql) {
  var conn = this.conn;
  return function (callback) {
    conn.query(sql, function (err, rows) {
      callback(err, rows);
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
