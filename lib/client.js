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

var mysql = require('mysql');
var RDSConnection = require('./connection');

module.exports = RDSClient;

function RDSClient(options) {
  if (!(this instanceof RDSClient)) {
    return new RDSClient(options);
  }
  this.pool = mysql.createPool(options);
  // if needFields = false, return rows result instead of {rows, fields} object result.
  this._needFields = options.needFields === false ? false : true;
}

var proto = RDSClient.prototype;

proto.query = function (sql, values) {
  var pool = this.pool;
  var needFields = this._needFields;
  return function (callback) {
    pool.query(sql, values, function (err, rows, fields) {
      if (needFields) {
        callback(err, { rows: rows, fields: fields });
      } else {
        callback(err, rows);
      }
    });
  };
};

proto.escape = function (val) {
  return this.pool.escape(val);
};

proto.getConnection = function () {
  var pool = this.pool;
  var needFields = this._needFields;
  return function (callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        return callback(err);
      }
      var conn = new RDSConnection(connection, needFields);
      callback(null, conn);
    });
  };
};
