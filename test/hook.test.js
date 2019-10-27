'use strict';

const assert = require('assert');
const rds = require('../');
const config = require('./config');

describe('hook.test.js', function() {

  describe('onConnection', function() {
    it('should hook onConnection', function* () {
      async function onConnection(conn) {
        await conn.query('SET SESSION autocommit=OFF');
      }
      const configHook = Object.assign({
        hook: {
          onConnection,
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
      function onQuery(sql) {
        console.log('sql: ', sql);
        assert.equal(sql, sqlTest);
      }
      const configHook = Object.assign({
        hook: {
          onQuery,
        },
      }, config);
      const db = rds(configHook);
      const rows = yield db.query(sqlTest);
      assert(rows);
      yield db.end();
    });
  });

});
