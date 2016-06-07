'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
const Operator = require('./operator');

module.exports = RDSConnection;

function RDSConnection(conn) {
  Operator.call(this);
  this.conn = conn;
}
util.inherits(RDSConnection, Operator);

const proto = RDSConnection.prototype;

proto.release = function () {
  this.conn.release();
};

proto._query = function (sql) {
  let conn = this.conn;
  return function (callback) {
    conn.query(sql, function (err, rows) {
      callback(err, rows);
    });
  };
};

proto.beginTransaction = function () {
  let conn = this.conn;
  return function (callback) {
    conn.beginTransaction(function (err, result) {
      callback(err, result);
    });
  };
};

proto.commit = function () {
  let conn = this.conn;
  return function (callback) {
    conn.commit(function (err, result) {
      callback(err, result);
    });
  };
};

proto.rollback = function () {
  let conn = this.conn;
  return function (callback) {
    conn.rollback(function () {
      callback();
    });
  };
};
