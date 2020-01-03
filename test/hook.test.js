'use strict';

const assert = require('assert');
const rds = require('../');
const config = require('./config');

describe('hook.test.js', function() {

  describe('onConnection', function() {
    it('should hook onConnection', function* () {
      function* onConnection(conn) {
        yield conn.query('SET SESSION autocommit=OFF');
      }
      const configHook = Object.assign({
        hook: {
          callback: {
            onConnection,
          },
        },
      }, config);
      const db = rds(configHook);
      const rows = yield db.query('select @@SESSION.autocommit as autocommit');
      assert(rows);
      assert.equal(rows[0].autocommit, 0);
      yield db.end();
    });
  });

  describe('onQuery', function() {
    it('should hook onQuery', function* () {
      const sqlTest = 'select @@SESSION.autocommit as autocommit';
      function onQuery(hook, ms, sequence, args) {
        console.log('query sql: ', sequence.sql);
        console.log('query time: ', ms + 'ms');
        console.log('query result: ', args);
        assert.equal(sequence.sql, sqlTest);
      }
      const configHook = Object.assign({
        hook: {
          callback: {
            onQuery,
          },
        },
      }, config);
      const db = rds(configHook);
      const rows = yield db.query(sqlTest);
      assert(rows);
      yield db.end();
    });
  });

});
