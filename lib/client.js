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
  this.pool = mysql.createPool(options);
}

var proto = RDSClient.prototype;

proto.query = function (sql, values) {
  var pool = this.pool;
  return function (callback) {
    pool.query(sql, values, function (err, rows, fields) {
      callback(err, { rows: rows, fields: fields });
    });
  };
};

proto.getConnection = function () {
  var pool = this.pool;
  return function (callback) {
    pool.getConnection(function (err, connection) {
      if (err) {
        return callback(err);
      }
      var conn = new RDSConnection(connection);
      callback(null, conn);
    });
  };
};
