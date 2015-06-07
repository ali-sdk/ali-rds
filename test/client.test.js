/**!
 * ali-rds - client.test.js
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

describe('client.test.js', function () {
  var prefix = 'prefix-' + process.version + '-';
  var table = 'ali-sdk-test-user';
  before(function* () {
    this.db = rds(config);
    yield this.db.query('delete from `ali-sdk-test-user` where name like ?', [prefix + '%']);
  });

  describe('rds(options)', function () {
    it('should connect rds success', function* () {
      var rows = yield this.db.query('show tables');
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query return rows', function* () {
      var conn = yield this.db.getConnection();
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
      var rows = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id',
        [prefix + 'm@fengmk2.com']);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'fengmk2');
      assert.equal(rows[1].name, prefix + 'fengmk3');
    });
  });

  describe('transactions', function () {
    it('should beginTransaction error', function* () {
      var db = rds({});
      try {
        yield db.beginTransaction();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        assert.equal(err.code, 'ECONNREFUSED');
      }
    });

    it('should throw error after transaction rollback', function* () {
      var tran = yield this.db.beginTransaction();
      yield tran.rollback();

      try {
        yield tran.select(table);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }

      try {
        yield tran.rollback();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }

      try {
        yield tran.commit();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }
    });

    it('should throw error after transaction commit', function* () {
      var tran = yield this.db.beginTransaction();
      yield tran.commit();

      try {
        yield tran.select(table);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }

      try {
        yield tran.commit();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }

      try {
        yield tran.rollback();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'transaction was commit or rollback');
      }
    });

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

      var rows = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id',
        [prefix + 'm@transaction.com']);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'transaction1');
      assert.equal(rows[1].name, prefix + 'transaction2');
    });

    it('should use db.beginTransaction()', function* () {
      var tran = yield this.db.beginTransaction();
      try {
        yield tran.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [prefix + 'beginTransaction1', prefix + 'm@beginTransaction.com']);
        yield tran.query('insert into `ali-sdk-test-user`(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [prefix + 'beginTransaction2', prefix + 'm@beginTransaction.com']);
        yield tran.commit();
      } catch (err) {
        // error, rollback
        yield tran.rollback(); // rollback call won't throw err
        throw err;
      }

      var rows = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id',
        [prefix + 'm@beginTransaction.com']);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransaction1');
      assert.equal(rows[1].name, prefix + 'beginTransaction2');
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

      var rows = yield this.db.query('select * from `ali-sdk-test-user` where email=? order by id',
        [prefix + 'm@transaction-fail.com']);
      assert.equal(rows.length, 0);
    });
  });

  describe('get(table, obj, options), select(table, options)', function () {
    before(function* () {
      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-get',
        email: prefix + 'm@fengmk2-get.com'
      });
      assert.equal(result.affectedRows, 1);

      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk3-get',
        email: prefix + 'm@fengmk2-get.com'
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should get exists object without columns', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'});
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');

      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, {
        orders: [['id', 'desc']]
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');

      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, {
        orders: [['id', 'desc'], 'gmt_modified', ['gmt_create', 'asc']]
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');
    });

    it('should get exists object with columns', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get.com'}, {
        columns: ['id', 'name']
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'name' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');
    });

    it('should get null when row not exists', function* () {
      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-get-not-exists.com'}, {
        columns: ['id', 'name']
      });
      assert.strictEqual(user, null);
    });

    it('should select objects without columns', function* () {
      var users = yield this.db.select('ali-sdk-test-user', {
        where: {email: prefix + 'm@fengmk2-get.com'},
      });
      assert(users);
      assert.equal(users.length, 2);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      var users = yield this.db.select('ali-sdk-test-user', {
        where: {email: prefix + 'm@fengmk2-get.com'},
        orders: [['id', 'desc']],
        limit: 1
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk3-get');

      var users = yield this.db.select('ali-sdk-test-user', {
        where: {email: prefix + 'm@fengmk2-get.com'},
        orders: [['id', 'desc']],
        limit: 1,
        offset: 1
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      var users = yield this.db.select('ali-sdk-test-user', {
        where: {email: prefix + 'm@fengmk2-get.com'},
        orders: [['id', 'desc']],
        limit: 10,
        offset: 100
      });
      assert(users);
      assert.equal(users.length, 0);
    });

    it('should select without options.where', function* () {
      var users = yield this.db.select(table);
      assert(users);
      assert.equal(users.length > 2, true);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email' ]);
    });

    it('should select with options.orders', function* () {
      var users = yield this.db.select(table, {
        orders: 'id'
      });
      assert(users[0].id < users[1].id);

      var users = yield this.db.select(table, {
        orders: [['id', 'desc'], null, 1]
      });
      assert(users[0].id > users[1].id);

      var users = yield this.db.select(table, {
        orders: ['id', ['name', 'foo']]
      });
      assert(users[0].id < users[1].id);
    });
  });

  describe('insert(table, row[s])', function () {
    it('should insert one row', function* () {
      var result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert1',
        email: prefix + 'm@fengmk2-insert.com'
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert with columns', function* () {
      var result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert-with-columns',
        email: prefix + 'm@fengmk2-insert-with-columns.com',
        ignoretitle: 'foo title'
      }, {
        columns: ['name', 'email']
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert multi rows', function* () {
      var result = yield this.db.insert(table, [
        {
          name: prefix + 'fengmk2-insert2',
          email: prefix + 'm@fengmk2-insert.com'
        },
        {
          name: prefix + 'fengmk2-insert3',
          email: prefix + 'm@fengmk2-insert.com'
        },
      ]);
      assert.equal(result.affectedRows, 2);
      var row = yield this.db.get(table, {id: result.insertId});
      assert(row);
      assert.equal(row.id, result.insertId);
    });

    it('should insert multi fail', function* () {
      try {
        yield this.db.insert(table, [
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com'
          },
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com'
          },
        ]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      var row = yield this.db.get(table, {name: prefix + 'fengmk2-insert4'});
      assert(!row);
    });

    it('should part success on Duplicate key without transaction', function* () {
      var result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert-no-tran',
        email: prefix + 'm@fengmk2-insert.com'
      });
      assert.equal(result.affectedRows, 1);
      var rows = yield this.db.select(table, {
        where: {name: prefix + 'fengmk2-insert-no-tran'}
      });
      assert.equal(rows.length, 1);

      try {
        yield this.db.insert(table, {
          name: prefix + 'fengmk2-insert-no-tran',
          email: prefix + 'm@fengmk2-insert.com'
        });
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      var rows = yield this.db.select(table, {
        where: {name: prefix + 'fengmk2-insert-no-tran'}
      });
      assert.equal(rows.length, 1);
    });

    it('should all fail on Duplicate key with transaction', function* () {
      var tran = yield this.db.beginTransaction();
      try {
        var result = yield tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com'
        });
        assert.equal(result.affectedRows, 1);
        var rows = yield tran.select(table, {
          where: {name: prefix + 'fengmk2-insert-has-tran'}
        });
        assert.equal(rows.length, 1);

        yield tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com'
        });

        yield tran.commit();
      } catch (err) {
        yield tran.rollback();
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }

      var rows = yield this.db.select(table, {
        where: {name: prefix + 'fengmk2-insert-has-tran'}
      });
      assert.equal(rows.length, 0);
    });
  });

  describe('update(table, obj, options)', function () {
    before(function* () {
      yield this.db.insert(table, {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update.com',
        gmt_create: this.db.literals.now,
        gmt_modified: this.db.literals.now,
      });
    });

    it('should throw error when cannot auto detect update condition', function* () {
      try {
        yield this.db.update(table, {});
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message,
          'Can\'t not auto detect update condition, please set options.where, or make sure obj.id exists');
      }
    });

    it('should get and update', function* () {
      yield this.db.insert(table, {
        name: prefix + 'fengmk2-update2',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_create: this.db.literals.now,
        gmt_modified: this.db.literals.now,
      });

      var user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update2',
      });
      user.email = prefix + 'm@fengmk2-update2-again.com';
      var result = yield this.db.update(table, user);
      assert.equal(result.affectedRows, 1);

      var row = yield this.db.get(table, {id: user.id});
      assert.equal(row.email, user.email);
    });

    it('should update exists row', function* () {
      var user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.equal(user.email, prefix + 'm@fengmk2-update.com');

      var result = yield this.db.update(table, {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_create: 'now()', // invalid date
        gmt_modified: this.db.literals.now,
      }, {
        where: {
          name: prefix + 'fengmk2-update',
        }
      });
      assert.equal(result.affectedRows, 1);

      var user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.equal(user.email, prefix + 'm@fengmk2-update2.com');
      assert.equal(user.gmt_create, '0000-00-00 00:00:00');
      assert(user.gmt_modified instanceof Date);

      user.email = prefix + 'm@fengmk2-update3.com';
      var result = yield this.db.update(table, user, {
        columns: ['email']
      });
      assert.equal(result.affectedRows, 1);
      var row = yield this.db.get(table, {id: user.id});
      assert.equal(row.email, user.email);
    });
  });

  describe('delete(table, where)', function () {
    before(function* () {
      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-delete',
        email: prefix + 'm@fengmk2-delete.com'
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);

      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk3-delete',
        email: prefix + 'm@fengmk2-delete.com'
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should delete exists rows', function* () {
      var result = yield this.db.delete('ali-sdk-test-user', {email: prefix + 'm@fengmk2-delete.com'});
      assert.equal(result.affectedRows, 2);
      assert.equal(result.insertId, 0);

      var user = yield this.db.get('ali-sdk-test-user', {email: prefix + 'm@fengmk2-delete.com'});
      assert(!user);
    });

    it('should delete not exists rows', function* () {
      var result = yield this.db.delete('ali-sdk-test-user', {email: prefix + 'm@fengmk2-delete-not-exists.com'});
      assert.equal(result.affectedRows, 0);
      assert.equal(result.insertId, 0);
    });

    it('should delete all rows when where = null', function* () {
      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-delete2',
        email: prefix + 'm@fengmk2-delete2.com'
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      var result = yield this.db.delete('ali-sdk-test-user');
      assert(result.affectedRows > 0);
      console.log('delete %d rows', result.affectedRows);

      var result = yield this.db.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com'
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      var result = yield this.db.delete('ali-sdk-test-user', null);
      assert(result.affectedRows > 0);

      var conn = yield this.db.getConnection();
      var result = yield conn.insert('ali-sdk-test-user', {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com'
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      var result = yield conn.delete('ali-sdk-test-user');
      assert(result.affectedRows > 0);
      conn.release();
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
