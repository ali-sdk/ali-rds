'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
const Operator = require('./operator');
const promisify = require('pify');

module.exports = RDSConnection;

function RDSConnection(conn) {
  Operator.call(this);
  this.conn = conn;
  if (!conn._wrapToRDS) {
    [
      'query',
      'beginTransaction',
      'commit',
      'rollback',
    ].forEach(key => {
      this.conn[key] = promisify(this.conn[key]);
    });
    conn._wrapToRDS = true;
  }
}

util.inherits(RDSConnection, Operator);

const proto = RDSConnection.prototype;

proto.release = function() {
  this.conn.release();
};

proto._query = function(sql) {
  return this.conn.query(sql);
};

proto.beginTransaction = function() {
  return this.conn.beginTransaction();
};

proto.commit = function() {
  return this.conn.commit();
};

proto.rollback = function() {
  return this.conn.rollback();
};
