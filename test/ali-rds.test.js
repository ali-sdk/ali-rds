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

    it('should use db.beginTransaction()', function* () {
      var conn = yield this.db.beginTransaction();
      try {
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [prefix + 'beginTransaction1', prefix + 'm@beginTransaction.com']);
        yield conn.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [prefix + 'beginTransaction2', prefix + 'm@beginTransaction.com']);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        throw err;
      } finally {
        // should release connection whatever
        conn.release();
      }

      var data = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id', [prefix + 'm@beginTransaction.com']);
      assert.equal(data.rows.length, 2);
      assert.equal(data.rows[0].name, prefix + 'beginTransaction1');
      assert.equal(data.rows[1].name, prefix + 'beginTransaction2');
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

  describe('get(table, obj, keys, columns, orders), list(table, obj, keys, columns, orders, limit)', function () {
    before(function* () {
      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-get',
        email: prefix + 'm@fengmk2-get.com'
      });
      assert.equal(result.rows.affectedRows, 1);

      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk3-get',
        email: prefix + 'm@fengmk2-get.com'
      });
      assert.equal(result.rows.affectedRows, 1);
    });

    it('should get exists object without columns', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, 'email');
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');

      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, 'email', null, [['id', 'desc']]);
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');

      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, 'email', null,
        [['id', 'desc'], 'gmt_modified', ['gmt_create', 'asc']]);
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');
    });

    it('should get exists object with columns', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, [ 'email' ], ['id', 'name']);
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'name' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');
    });

    it('should get null when row not exists', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get-not-exists.com'}, [ 'email' ], ['id', 'name']);
      assert.strictEqual(user, null);
    });

    it('should list objects without columns', function* () {
      var result = yield this.db.list('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, 'email');
      var users = result.rows;
      assert(users);
      assert.equal(users.length, 2);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      var result = yield this.db.list('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'},
        'email', null, [['id', 'desc']], 1);
      var users = result.rows;
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk3-get');

      var result = yield this.db.list('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'},
        'email', null, [['id', 'desc']], 1, 1);
      var users = result.rows;
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      var result = yield this.db.list('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'},
        'email', null, [['id', 'desc']], 10, 100);
      var users = result.rows;
      assert(users);
      assert.equal(users.length, 0);
    });
  });

  describe('update(table, obj, keys, columns)', function () {
    before(function* () {
      yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update.com'
      });
    });

    it('should update exists row', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {
        name: prefix + 'fengmk2-update',
      }, 'name');
      assert.equal(user.email, prefix + 'm@fengmk2-update.com');

      var result = yield this.db.update('ali-sdk-test-user', {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_modified: 'now()',
      }, 'name');
      assert.equal(result.rows.affectedRows, 1);

      var user = yield this.db.get('ali-sdk-test-user', {
        name: prefix + 'fengmk2-update',
      }, 'name');
      assert.equal(user.email, prefix + 'm@fengmk2-update2.com');
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
        assert.equal(err.message.indexOf('connect ECONNREFUSED'), 0);
      }
    });
  });
});
