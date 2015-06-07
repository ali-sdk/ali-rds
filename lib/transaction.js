/**!
 * ali-rds - lib/transaction.js
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

const util = require('util');
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

proto.commit = function* () {
  this._check();
  try {
    return yield this.conn.commit();
  } finally {
    this.conn.release();
    this.conn = null;
  }
};

proto.rollback = function* () {
  this._check();
  try {
    return yield this.conn.rollback();
  } finally {
    this.conn.release();
    this.conn = null;
  }
};

proto._query = function* (sql) {
  this._check();
  return yield this.conn._query(sql);
};

proto._check = function () {
  if (!this.conn) {
    throw new Error('transaction was commit or rollback');
  }
};
