'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const mysql = require('mysql');
const SqlString = require('../lib/sqlstring');
const literals = require('../lib/literals');

describe('sqlstring.test.js', function() {
  describe('escape()', function() {
    it('should patch escape to support Literal class', function() {
      assert.equal(SqlString.escape(literals.now), 'now()');
      assert.equal(SqlString.escape(new literals.Literal('sum')), 'sum');
      assert.equal(SqlString.escape(literals.Literal('sum2()')), 'sum2()');
      assert.equal(SqlString.escape(literals.now), mysql.escape(literals.now));
    });

    it('should only patch once', function() {
      require.cache[require.resolve('../lib/sqlstring')] = null;
      const AnotherSqlString = require('../lib/sqlstring');
      assert.equal(AnotherSqlString.escape(literals.now), 'now()');
      assert.equal(AnotherSqlString.escape(new literals.Literal('sum')), 'sum');
      assert.equal(AnotherSqlString.escape(literals.Literal('sum2()')), 'sum2()');
      assert.equal(AnotherSqlString.escape(literals.now), mysql.escape(literals.now));
    });
  });
});
