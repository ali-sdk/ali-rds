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
  var prefix = 'prefix-' + process.version + '-';
  before(function* () {
    this.db = rds(config);
    yield this.db.query('delete from `ali-sdk-test-user` where name like ?', [prefix + '%']);
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
        [prefix + 'fengmk2', prefix + 'm@fengmk2.com']);
      yield this.db.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [prefix + 'fengmk3', prefix + 'm@fengmk2.com']);
    });

    it('should select 2 rows', function* () {
      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', [prefix + 'm@fengmk2.com']);
      assert.equal(data.rows.length, 2);
      assert.equal(data.rows[0].name, prefix + 'fengmk2');
      assert.equal(data.rows[1].name, prefix + 'fengmk3');
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
          [prefix + 'transaction1', prefix + 'm@transaction.com']);
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [prefix + 'transaction2', prefix + 'm@transaction.com']);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        throw err;
      } finally {
        // should release connection whatever
        conn.release();
      }

      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', [prefix + 'm@transaction.com']);
      assert.equal(data.rows.length, 2);
      assert.equal(data.rows[0].name, prefix + 'transaction1');
      assert.equal(data.rows[1].name, prefix + 'transaction2');
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
          [prefix + 'transaction-fail1', 'm@transaction-fail.com']);
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          valuefail(?, ?, now(), now())',
          [prefix + 'transaction-fail12', 'm@transaction-fail.com']);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        assert.equal(err.code, 'ER_PARSE_ERROR');
      } finally {
        // should release connection whatever
        conn.release();
      }

      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', [prefix + 'm@transaction-fail.com']);
      assert.equal(data.rows.length, 0);
      assert.equal(data.fields.length, 5);
    });
  });

  describe('getConnection()', function () {
    it('should throw error when mysql connect fail', function* () {
      var db = rds({
        port: 33061
      });
      try {
        yield db.getConnection();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        assert.equal(err.message, 'connect ECONNREFUSED');
      }
    });
  });
});
