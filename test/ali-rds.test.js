/**!
 * ali-rds - ali-rds.test.js
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

var assert = require('assert');
var rds = require('../');
var config = require('./config');

describe('ali-rds.test.js', function () {
  before(function* () {
    this.db = rds(config);
    yield this.db.query('truncate `ali-sdk-test-user`');
  });

  describe('rds(options)', function () {
    it('should connect rds success', function* () {
      var data = yield this.db.query('show tables');
      assert(data);
      assert(Array.isArray(data.rows));
      assert.equal(data.fields.length, 1);
    });
  });

  describe('options.needFields = false', function () {
    var options = {};
    for (var k in config) {
      options[k] = config[k];
    }
    options.needFields = false;
    var db = rds(options);

    it('should return rows only', function* () {
      var rows = yield db.query('show tables');
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query return rows only', function* () {
      var conn = yield db.getConnection();
      var rows = yield conn.query('show tables');
      conn.release();
      assert(rows);
      assert(Array.isArray(rows));
    });
  });

  describe('escape()', function () {
    it('should client return escape string', function () {
      assert.equal(this.db.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
    });

    it('should connection return escape string', function* () {
      var conn = yield this.db.getConnection();
      assert.equal(conn.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
      conn.release();
    });
  });

  describe('query()', function () {
    before(function* () {
      yield this.db.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        ['fengmk2', 'm@fengmk2.com']);
      yield this.db.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        ['fengmk3', 'm@fengmk2.com']);
    });

    it('should select 2 rows', function* () {
      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', ['m@fengmk2.com']);
      assert.equal(data.rows.length, 2);
      assert.equal(data.rows[0].name, 'fengmk2');
      assert.equal(data.rows[1].name, 'fengmk3');
      assert.equal(data.fields.length, 5);
    });
  });

  describe('transactions', function () {
    it('should insert 2 rows in a transaction', function* () {
      var conn = yield this.db.getConnection();
      try {
        yield conn.beginTransaction();
      } catch (err) {
        conn.release();
        throw err;
      }

      try {
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          ['transaction1', 'm@transaction.com']);
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          ['transaction2', 'm@transaction.com']);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        throw err;
      } finally {
        // should release connection whatever
        conn.release();
      }

      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', ['m@transaction.com']);
      assert.equal(data.rows.length, 2);
      assert.equal(data.rows[0].name, 'transaction1');
      assert.equal(data.rows[1].name, 'transaction2');
      assert.equal(data.fields.length, 5);
    });

    it('should rollback when query fail', function* () {
      var conn = yield this.db.getConnection();
      try {
        yield conn.beginTransaction();
      } catch (err) {
        conn.release();
        throw err;
      }

      try {
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          ['transaction-fail1', 'm@transaction-fail.com']);
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          valuefail(?, ?, now(), now())',
          ['transaction-fail12', 'm@transaction-fail.com']);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        assert.equal(err.code, 'ER_PARSE_ERROR');
      } finally {
        // should release connection whatever
        conn.release();
      }

      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', ['m@transaction-fail.com']);
      assert.equal(data.rows.length, 0);
      assert.equal(data.fields.length, 5);
    });
  });
});
