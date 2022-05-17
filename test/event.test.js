'use strict';

const assert = require('assert');
const rds = require('../');
const config = require('./config');
const { EVENT_RDS_REQUEST, EVENT_RDS_RESPONSE } = require('../lib/constant');

let emitRequest = [];
let emitResponse = [];

describe('event.test.js', function() {
  const prefix = 'prefix-' + process.version + '-';
  const table = 'ali-sdk-test-user';
  beforeEach(function* () {
    this.db = rds(config);
    yield this.db.query('delete from ?? where name like ?', [ table, prefix + '%' ]);
    this.db.on(EVENT_RDS_REQUEST, function(data) {
      emitRequest.push(data);
    });
    this.db.on(EVENT_RDS_RESPONSE, function(data) {
      emitResponse.push(data);
    });
  });

  afterEach(function(done) {
    emitRequest = [];
    emitResponse = [];
    this.db.end(done);
  });

  describe('rds query emit', function() {
    it('should rds emit success', function* () {
      const values = [ table, prefix + 'query@test.com' ];
      const sql = `select * from \`${values[0]}\` where email='${values[1]}' order by id`;
      const rows = yield this.db.query('select * from ?? where email=? order by id', values);
      assert.equal(emitRequest[0].sql, sql);
      assert.deepEqual(emitRequest[0].values, values);
      assert.equal(emitResponse[0].sql, sql);
      assert.deepEqual(emitResponse[0].values, values);
      assert(emitResponse[0].hasOwnProperty('execDuration'));
      assert(Array.isArray(emitResponse[0].rows));
      assert(rows);
      assert(Array.isArray(rows));
    });
    it('should rds emit error', function* () {
      const noTable = 'no-table';
      const values = [ noTable, prefix + 'error@test.com' ];
      const sql = `select * from \`${noTable}\` where email='${prefix + 'error@test.com'}' order by id`;
      try {
        yield this.db.query('select * from ?? where email=? order by id', values);
      } catch (err) {
        assert(err);
      }
      assert.equal(emitRequest[0].sql, sql);
      assert.deepEqual(emitRequest[0].values, values);
      assert.equal(emitResponse[0].sql, sql);
      assert.deepEqual(emitResponse[0].values, values);
      assert(emitResponse[0].hasOwnProperty('execDuration'));
      assert(emitResponse[0].error);
    });

    it('should rds getConnection emit success', function* () {
      const conn = yield this.db.getConnection();
      const values = [ table, prefix + 'getConnection@test.com' ];
      const sql = `select * from \`${values[0]}\` where email='${values[1]}' order by id`;
      const rows = yield conn.query('select * from ?? where email=? order by id', values);
      assert.equal(emitRequest[0].sql, sql);
      assert.deepEqual(emitRequest[0].values, values);
      assert.equal(emitResponse[0].sql, sql);
      assert.deepEqual(emitResponse[0].values, values);
      assert(emitResponse[0].hasOwnProperty('execDuration'));
      assert(Array.isArray(emitResponse[0].rows));
      assert(rows);
      assert(Array.isArray(rows));
    });

    it('should rds beginTransaction emit success', function* () {
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
      assert.equal(emitRequest.length, 2);
      assert.equal(emitResponse.length, 2);
      const rows = yield this.db.query('select * from ?? where email=? order by id',
        [ table, prefix + 'm@beginTransaction.com' ]);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'beginTransaction1');
      assert.equal(rows[1].name, prefix + 'beginTransaction2');
      assert.equal(emitRequest.length, 3);
      assert.equal(emitResponse.length, 3);
    });

    it('should event clear when end', function* () {
      const rows = yield this.db.query('show tables');
      assert(rows);
      assert(Array.isArray(rows));
      assert.deepEqual(this.db.eventNames(), [ EVENT_RDS_REQUEST, EVENT_RDS_RESPONSE ]);
      this.db.end(() => {});
      assert.equal(this.db.eventNames().length, 0);
    });
  });
});
