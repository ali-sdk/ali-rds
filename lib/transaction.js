'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
// const wrap = require('co-wrap-all');
const Operator = require('./operator');

module.exports = RDSTransaction;

function RDSTransaction(conn) {
  Operator.call(this);
  this.conn = conn;
  this.isCommit = false;
  this.isRollback = false;
}
util.inherits(RDSTransaction, Operator);

const proto = RDSTransaction.prototype;

proto.commit = async function() {
  this._check();
  try {
    return await this.conn.commit();
  } finally {
    this.conn.release();
    this.conn = null;
  }
};

proto.rollback = async function() {
  this._check();
  try {
    return await this.conn.rollback();
  } finally {
    this.conn.release();
    this.conn = null;
  }
};

proto._query = async function(sql) {
  this._check();
  return await this.conn._query(sql);
};

proto._check = function() {
  if (!this.conn) {
    throw new Error('transaction was commit or rollback');
  }
};

// wrap(proto);
