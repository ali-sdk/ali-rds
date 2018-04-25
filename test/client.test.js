'use strict';

const co = require('co');
const assert = require('assert');
const rds = require('../');
const config = require('./config');

describe('client.test.js', function() {
  const prefix = 'prefix-' + process.version + '-';
  const table = 'ali-sdk-test-user';
  before(function* () {
    this.db = rds(config);
    yield this.db.query('delete from ?? where name like ?', [ table, prefix + '%' ]);
  });

  after(function(done) {
    this.db.end(done);
  });

  describe('rds(options)', function() {
    it('should connect rds success', function* () {
      const rows = yield this.db.query('show tables');
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query return rows', function* () {
      const conn = yield this.db.getConnection();
      const rows = yield conn.query('show tables');
      conn.release();
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should connection query one row', function* () {
      const conn = yield this.db.getConnection();
      const row = yield conn.queryOne('show tables');
      conn.release();
      assert(row);
    });
  });

  describe('escape()', function() {
    it('should client return escape string', function() {
      assert.equal(this.db.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
    });

    it('should connection return escape string', function* () {
      const conn = yield this.db.getConnection();
      assert.equal(conn.escape('\'\"?<//\\'), '\'\\\'\\"?<//\\\\\'');
      conn.release();
    });
  });

  describe('query(), queryOne()', function() {
    before(function* () {
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [ table, prefix + 'fengmk2', prefix + 'm@fengmk2.com' ]);
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [ table, prefix + 'fengmk3', prefix + 'm@fengmk2.com' ]);
    });

    it('should select 2 rows', function* () {
      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@fengmk2.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'fengmk2');
      assert.equal(rows[1].name, prefix + 'fengmk3');
    });

    it('should select 1 row', function* () {
      const row = yield this.db.queryOne('select * from ?? where email=? order by id',
        [ table, prefix + 'm@fengmk2.com' ]);
      assert.equal(row.name, prefix + 'fengmk2');
    });
  });

  describe('transactions', function() {
    it('should beginTransaction error', function* () {
      const db = rds({
        port: 12312,
      });
      try {
        yield db.beginTransaction();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.name, 'RDSClientGetConnectionError');
        // assert.equal(err.code, 'ECONNREFUSED');
      }
    });

    it('should throw error after transaction rollback', function* () {
      const tran = yield this.db.beginTransaction();
      yield tran.rollback();

      try {
        yield tran.select(table);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }

      try {
        yield tran.rollback();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }

      try {
        yield tran.commit();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }
    });

    it('should throw error after transaction commit', function* () {
      const tran = yield this.db.beginTransaction();
      yield tran.commit();

      try {
        yield tran.select(table);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }

      try {
        yield tran.commit();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }

      try {
        yield tran.rollback();
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message.indexOf('transaction was commit or rollback'), 0);
      }
    });

    it('should insert 2 rows in a transaction', function* () {
      const conn = yield this.db.getConnection();
      try {
        yield conn.beginTransaction();
      } catch (err) {
        conn.release();
        throw err;
      }

      try {
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'transaction1', prefix + 'm@transaction.com' ]);
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'transaction2', prefix + 'm@transaction.com' ]);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        throw err;
      } finally {
        // should release connection whatever
        conn.release();
      }

      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@transaction.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'transaction1');
      assert.equal(rows[1].name, prefix + 'transaction2');
    });

    it('should use db.beginTransaction()', function* () {
      const tran = yield this.db.beginTransaction();
      try {
        yield tran.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'beginTransaction1', prefix + 'm@beginTransaction.com' ]);
        yield tran.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'beginTransaction2', prefix + 'm@beginTransaction.com' ]);
        yield tran.commit();
      } catch (err) {
        // error, rollback
        yield tran.rollback(); // rollback call won't throw err
        throw err;
      }

      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransaction.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransaction1');
      assert.equal(rows[1].name, prefix + 'beginTransaction2');
    });

    it('should rollback when query fail', function* () {
      const conn = yield this.db.getConnection();
      try {
        yield conn.beginTransaction();
      } catch (err) {
        conn.release();
        throw err;
      }

      try {
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'transaction-fail1', 'm@transaction-fail.com' ]);
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          valuefail(?, ?, now(), now())',
          [ table, prefix + 'transaction-fail12', 'm@transaction-fail.com' ]);
        yield conn.commit();
      } catch (err) {
        // error, rollback
        yield conn.rollback(); // rollback call won't throw err
        assert.equal(err.code, 'ER_PARSE_ERROR');
        assert(/sql: insert into/.test(err.stack), err.stack);
      } finally {
        // should release connection whatever
        conn.release();
      }

      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@transaction-fail.com' ]);
      assert.equal(rows.length, 0);
    });
  });

  describe('beginTransactionScope(scope)', function() {
    it('should beginTransactionScope() error', function* () {
      const db = rds({
        port: 12312,
      });
      try {
        yield db.beginTransactionScope(function* () {
          // do nothing
        });
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.name, 'RDSClientGetConnectionError');
      }
    });

    it('should insert 2 rows in a transaction', function* () {
      const result = yield this.db.beginTransactionScope(function* (conn) {
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'beginTransactionScope1', prefix + 'm@beginTransactionScope1.com' ]);
        yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
          values(?, ?, now(), now())',
          [ table, prefix + 'beginTransactionScope2', prefix + 'm@beginTransactionScope1.com' ]);
        return true;
      });

      assert.equal(result, true);

      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransactionScope1.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransactionScope1');
      assert.equal(rows[1].name, prefix + 'beginTransactionScope2');
    });

    it('should rollback when query fail', function* () {
      try {
        yield this.db.beginTransactionScope(function* (conn) {
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            values(?, ?, now(), now())',
            [ table, prefix + 'beginTransactionScope-fail1', 'm@beginTransactionScope-fail.com' ]);
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            valuefail(?, ?, now(), now())',
            [ table, prefix + 'beginTransactionScope-fail12', 'm@beginTransactionScope-fail.com' ]);
          return true;
        });
      } catch (err) {
        assert.equal(err.code, 'ER_PARSE_ERROR');
      }

      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransactionScope-fail.com' ]);
      assert.equal(rows.length, 0);
    });

    describe('beginTransactionScope(fn, ctx)', function() {
      it('should insert 7 rows in a transaction with ctx', function* () {
        const ctx = {};
        const db = this.db;

        function* hiInsert() {
          return yield db.beginTransactionScope(function* (conn) {
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScopeCtx3', prefix + 'm@beginTransactionScopeCtx1.com' ]);
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScopeCtx4', prefix + 'm@beginTransactionScopeCtx1.com' ]);
            return true;
          }, ctx);
        }

        function* fooInsert() {
          return yield db.beginTransactionScope(function* (conn) {
            yield hiInsert();

            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScopeCtx5', prefix + 'm@beginTransactionScopeCtx1.com' ]);
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScopeCtx6', prefix + 'm@beginTransactionScopeCtx1.com' ]);
            return true;
          }, ctx);
        }

        function* barInsert() {
          return yield db.beginTransactionScope(function* (conn) {
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScopeCtx7', prefix + 'm@beginTransactionScopeCtx1.com' ]);
            return true;
          }, ctx);
        }

        const result = yield db.beginTransactionScope(function* (conn) {
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            values(?, ?, now(), now())',
            [ table, prefix + 'beginTransactionScopeCtx1', prefix + 'm@beginTransactionScopeCtx1.com' ]);
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            values(?, ?, now(), now())',
            [ table, prefix + 'beginTransactionScopeCtx2', prefix + 'm@beginTransactionScopeCtx1.com' ]);

          // test query one
          const row = yield conn.queryOne('select * from ?? where name=?', [ table, prefix + 'beginTransactionScopeCtx1' ]);
          assert(row);
          assert.equal(row.name, prefix + 'beginTransactionScopeCtx1');

          const fooResult = yield fooInsert();
          assert.equal(fooResult, true);
          const barResult = yield barInsert();
          assert.equal(barResult, true);

          return true;
        }, ctx);

        assert.equal(result, true);

        const rows = yield db.query('select * from ?? where email=? order by id',
          [ table, prefix + 'm@beginTransactionScopeCtx1.com' ]);
        assert.equal(rows.length, 7);
        assert.equal(rows[0].name, prefix + 'beginTransactionScopeCtx1');
        assert.equal(rows[1].name, prefix + 'beginTransactionScopeCtx2');
        assert.equal(rows[2].name, prefix + 'beginTransactionScopeCtx3');
        assert.equal(rows[3].name, prefix + 'beginTransactionScopeCtx4');
        assert.equal(rows[4].name, prefix + 'beginTransactionScopeCtx5');
        assert.equal(rows[5].name, prefix + 'beginTransactionScopeCtx6');
        assert.equal(rows[6].name, prefix + 'beginTransactionScopeCtx7');
        assert.equal(ctx._transactionConnection, null);
        assert.equal(ctx._transactionScopeCount, 0);
      });

      it('should auto rollback on fail', function* () {
        const ctx = {};
        const db = this.db;

        function* fooInsert() {
          return yield db.beginTransactionScope(function* (conn) {
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScope-ctx-fail1', prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScope-ctx-fail2', prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);
            return true;
          }, ctx);
        }

        function* barInsert() {
          return yield db.beginTransactionScope(function* (conn) {
            yield fooInsert();
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScope-ctx-fail3', prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);
            return true;
          }, ctx);
        }

        try {
          yield db.beginTransactionScope(function* (conn) {
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScope-ctx-fail1', prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);
            yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
              values(?, ?, now(), now())',
              [ table, prefix + 'beginTransactionScope-ctx-fail2', prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);

            yield barInsert();
            throw new Error('should not run this');
          }, ctx);
        } catch (err) {
          assert.equal(err.code, 'ER_DUP_ENTRY');
        }

        const rows = yield db.query('select * from ?? where email=? order by id',
          [ table, prefix + 'm@beginTransactionScope-ctx-fail1.com' ]);
        assert.equal(rows.length, 0);
        assert.equal(ctx._transactionConnection, null);
        assert.equal(ctx._transactionScopeCount, 3);
      });
    });
  });

  describe('beginDoomedTransactionScope(scope)', function() {

    it('should insert 0 rows in a doomed transaction with ctx', function* () {
      const ctx = {};
      const db = this.db;

      function* insert() {
        return yield db.beginDoomedTransactionScope(function* (conn) {
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            values(?, ?, now(), now())',
            [ table, prefix + 'beginDoomedTransactionScopeCtx1', prefix + 'm@beginDoomedTransactionScopeCtx1.com' ]);
          yield conn.query('insert into ??(name, email, gmt_create, gmt_modified) \
            values(?, ?, now(), now())',
            [ table, prefix + 'beginDoomedTransactionScopeCtx2', prefix + 'm@beginDoomedTransactionScopeCtx1.com' ]);
          return true;
        }, ctx);
      }

      yield insert();

      const rows = yield db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginDoomedTransactionScopeCtx1.com' ]);
      assert.equal(rows.length, 0);
      assert.equal(ctx._transactionConnection, null);
      assert.equal(ctx._transactionScopeCount, 0);
    });
  });

  describe('get(table, obj, options), select(table, options)', function() {
    before(function* () {
      let result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-get',
        email: prefix + 'm@fengmk2-get.com',
      });
      assert.equal(result.affectedRows, 1);

      result = yield this.db.insert(table, {
        name: prefix + 'fengmk3-get',
        email: prefix + 'm@fengmk2-get.com',
      });
      assert.equal(result.affectedRows, 1);

      result = yield this.db.insert(table, {
        name: prefix + 'fengmk-mobile-get',
        email: prefix + 'm@fengmk2-mobile-get.com',
        mobile: prefix + '13800000000',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should get support NULL value', function* () {
      let user = yield this.db.get(table, { mobile: null });
      assert(user);
      assert(user.mobile === null);
      user = yield this.db.get(table, { mobile: undefined });
      assert(user);
      assert(user.mobile === null);
      user = yield this.db.get(table, { mobile: prefix + '13800000000' });
      assert(user);
      assert(user.mobile === prefix + '13800000000');
    });

    it('should get exists object without columns', function* () {
      let user = yield this.db.get(table, { email: prefix + 'm@fengmk2-get.com' });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');

      user = yield this.db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        orders: [[ 'id', 'desc' ]],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');

      user = yield this.db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        orders: [[ 'id', 'desc' ], 'gmt_modified', [ 'gmt_create', 'asc' ]],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(user.name, prefix + 'fengmk3-get');
    });

    it('should get exists object with columns', function* () {
      const user = yield this.db.get(table, { email: prefix + 'm@fengmk2-get.com' }, {
        columns: [ 'id', 'name' ],
      });
      assert(user);
      assert.deepEqual(Object.keys(user), [ 'id', 'name' ]);
      assert.equal(user.name, prefix + 'fengmk2-get');
    });

    it('should get null when row not exists', function* () {
      const user = yield this.db.get(table, { email: prefix + 'm@fengmk2-get-not-exists.com' }, {
        columns: [ 'id', 'name' ],
      });
      assert.strictEqual(user, null);
    });

    it('should select objects without columns', function* () {
      let users = yield this.db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
      });
      assert(users);
      assert.equal(users.length, 2);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      users = yield this.db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 1,
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk3-get');

      users = yield this.db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 1,
        offset: 1,
      });
      assert(users);
      assert.equal(users.length, 1);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
      assert.equal(users[0].name, prefix + 'fengmk2-get');

      users = yield this.db.select(table, {
        where: { email: prefix + 'm@fengmk2-get.com' },
        orders: [[ 'id', 'desc' ]],
        limit: 10,
        offset: 100,
      });
      assert(users);
      assert.equal(users.length, 0);
    });

    it('should select without options.where', function* () {
      const users = yield this.db.select(table);
      assert(users);
      assert.equal(users.length > 2, true);
      assert.deepEqual(Object.keys(users[0]), [ 'id', 'gmt_create', 'gmt_modified', 'name', 'email', 'mobile' ]);
    });

    it('should select with options.orders', function* () {
      let users = yield this.db.select(table, {
        orders: 'id',
      });
      assert(users.length >= 2);
      assert(users[0].id < users[1].id);

      users = yield this.db.select(table, {
        orders: [[ 'id', 'desc' ], null, 1 ],
      });
      assert(users.length >= 2);
      assert(users[0].id > users[1].id);

      users = yield this.db.select(table, {
        orders: [ 'id', [ 'name', 'foo' ]],
      });
      assert(users.length >= 2);
      assert(users[0].id < users[1].id);
    });
  });

  describe('insert(table, row[s])', function() {
    it('should insert one row', function* () {
      const result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert1',
        email: prefix + 'm@fengmk2-insert.com',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert with columns', function* () {
      const result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert-with-columns',
        email: prefix + 'm@fengmk2-insert-with-columns.com',
        ignoretitle: 'foo title',
      }, {
        columns: [ 'name', 'email' ],
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should insert multi rows', function* () {
      const result = yield this.db.insert(table, [
        {
          name: prefix + 'fengmk2-insert2',
          email: prefix + 'm@fengmk2-insert.com',
        },
        {
          name: prefix + 'fengmk2-insert3',
          email: prefix + 'm@fengmk2-insert.com',
        },
      ]);
      assert.equal(result.affectedRows, 2);
      const row = yield this.db.get(table, { id: result.insertId });
      assert(row);
      assert.equal(row.id, result.insertId);
    });

    it('should insert multi fail', function* () {
      try {
        yield this.db.insert(table, [
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com',
          },
          {
            name: prefix + 'fengmk2-insert4',
            email: prefix + 'm@fengmk2-insert.com',
          },
        ]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      const row = yield this.db.get(table, { name: prefix + 'fengmk2-insert4' });
      assert(!row);
    });

    it('should part success on Duplicate key without transaction', function* () {
      const result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-insert-no-tran',
        email: prefix + 'm@fengmk2-insert.com',
      });
      assert.equal(result.affectedRows, 1);
      let rows = yield this.db.select(table, {
        where: { name: prefix + 'fengmk2-insert-no-tran' },
      });
      assert.equal(rows.length, 1);

      try {
        yield this.db.insert(table, {
          name: prefix + 'fengmk2-insert-no-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }
      rows = yield this.db.select(table, {
        where: { name: prefix + 'fengmk2-insert-no-tran' },
      });
      assert.equal(rows.length, 1);
    });

    it('should all fail on Duplicate key with transaction', function* () {
      const tran = yield this.db.beginTransaction();
      try {
        const result = yield tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });
        assert.equal(result.affectedRows, 1);
        const rows = yield tran.select(table, {
          where: { name: prefix + 'fengmk2-insert-has-tran' },
        });
        assert.equal(rows.length, 1);

        yield tran.insert(table, {
          name: prefix + 'fengmk2-insert-has-tran',
          email: prefix + 'm@fengmk2-insert.com',
        });

        yield tran.commit();
      } catch (err) {
        yield tran.rollback();
        assert.equal(err.code, 'ER_DUP_ENTRY');
      }

      const rows = yield this.db.select(table, {
        where: { name: prefix + 'fengmk2-insert-has-tran' },
      });
      assert.equal(rows.length, 0);
    });
  });

  describe('update(table, obj, options)', function() {
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
          'Can not auto detect update condition, please set options.where, or make sure obj.id exists');
      }
    });

    it('should get and update', function* () {
      yield this.db.insert(table, {
        name: prefix + 'fengmk2-update2',
        email: prefix + 'm@fengmk2-update2.com',
        gmt_create: this.db.literals.now,
        gmt_modified: this.db.literals.now,
      });

      const user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update2',
      });
      user.email = prefix + 'm@fengmk2-update2-again.com';
      const result = yield this.db.update(table, user);
      assert.equal(result.affectedRows, 1);

      const row = yield this.db.get(table, { id: user.id });
      assert.equal(row.email, user.email);
    });

    it('should update exists row', function* () {
      let user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.equal(user.email, prefix + 'm@fengmk2-update.com');

      let result = yield this.db.update(table, {
        name: prefix + 'fengmk2-update',
        email: prefix + 'm@fengmk2-update2.com',
        // gmt_create: 'now()', // invalid date, will throw error now
        gmt_create: this.db.literals.now,
        gmt_modified: this.db.literals.now,
      }, {
        where: {
          name: prefix + 'fengmk2-update',
        },
      });
      assert.equal(result.affectedRows, 1);

      user = yield this.db.get(table, {
        name: prefix + 'fengmk2-update',
      });
      assert.equal(user.email, prefix + 'm@fengmk2-update2.com');
      // assert.equal(user.gmt_create, '0000-00-00 00:00:00');
      assert(user.gmt_modified instanceof Date);
      assert(user.gmt_create instanceof Date);

      user.email = prefix + 'm@fengmk2-update3.com';
      result = yield this.db.update(table, user, {
        columns: [ 'email' ],
      });
      assert.equal(result.affectedRows, 1);
      const row = yield this.db.get(table, { id: user.id });
      assert.equal(row.email, user.email);
    });
  });

  describe('delete(table, where)', function() {
    before(function* () {
      let result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-delete',
        email: prefix + 'm@fengmk2-delete.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);

      result = yield this.db.insert(table, {
        name: prefix + 'fengmk3-delete',
        email: prefix + 'm@fengmk2-delete.com',
      });
      assert.equal(result.affectedRows, 1);
    });

    it('should delete exists rows', function* () {
      const result = yield this.db.delete(table, { email: prefix + 'm@fengmk2-delete.com' });
      assert.equal(result.affectedRows, 2);
      assert.equal(result.insertId, 0);

      const user = yield this.db.get(table, { email: prefix + 'm@fengmk2-delete.com' });
      assert(!user);
    });

    it('should delete not exists rows', function* () {
      const result = yield this.db.delete(table, { email: prefix + 'm@fengmk2-delete-not-exists.com' });
      assert.equal(result.affectedRows, 0);
      assert.equal(result.insertId, 0);
    });

    it('should delete all rows when where = null', function* () {
      let result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-delete2',
        email: prefix + 'm@fengmk2-delete2.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = yield this.db.delete(table);
      assert(result.affectedRows > 0);
      console.log('delete %d rows', result.affectedRows);

      result = yield this.db.insert(table, {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = yield this.db.delete(table, null);
      assert(result.affectedRows > 0);

      const conn = yield this.db.getConnection();
      result = yield conn.insert(table, {
        name: prefix + 'fengmk2-delete3',
        email: prefix + 'm@fengmk2-delete3.com',
      });
      assert.equal(result.affectedRows, 1);
      assert(result.insertId > 0);
      result = yield conn.delete(table);
      assert(result.affectedRows > 0);
      conn.release();
    });
  });

  describe('getConnection()', function() {
    it('should throw error when mysql connect fail', function* () {
      const db = rds({
        port: 33061,
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

  describe('count()', function() {
    before(function* () {
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [ table, prefix + 'fengmk2-count', prefix + 'm@fengmk2-count.com' ]);
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [ table, prefix + 'fengmk3-count', prefix + 'm@fengmk2-count.com' ]);
    });

    it('should get total table rows count', function* () {
      let count = yield this.db.count(table);
      assert(count >= 2);

      count = yield this.db.count(table, {
        email: prefix + 'm@fengmk2-count.com',
      });
      assert.equal(count, 2);

      count = yield this.db.count(table, { id: -1 });
      assert.equal(count, 0);
    });
  });

  describe('mock query after client end', function() {
    it('should query throw error after end', function* () {
      const db = rds(config);
      yield db.query('select * from ?? limit 10', [ table ]);
      yield db.end();
      const db2 = rds(config);

      try {
        yield db.query('select * from ?? limit 10', [ table ]);
        throw new Error('should not run this');
      } catch (err) {
        assert.equal(err.message, 'Pool is closed.');
      }

      yield db2.query('select * from ?? limit 10', [ table ]);
      yield db2.end();
    });

    it('should support end with callback style', function(done) {
      const db = rds(config);
      co(function* () {
        yield db.query('select * from ?? limit 10', [ table ]);
        db.end(done);
      }).catch(done);
    });
  });
});
