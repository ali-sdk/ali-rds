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

module.exports = RDSConnection;

function RDSConnection(conn, needFields) {
  this.conn = conn;
  this._needFields = needFields;
}

var proto = RDSConnection.prototype;

proto.release = function () {
  this.conn.release();
};

proto.query = function (sql, values) {
  var conn = this.conn;
  var needFields = this._needFields;
  return function (callback) {
    conn.query(sql, values, function (err, rows, fields) {
      if (needFields) {
        callback(err, { rows: rows, fields: fields });
      } else {
        callback(err, rows);
      }
    });
  };
};

proto.escape = function (val) {
  return this.conn.escape(val);
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
