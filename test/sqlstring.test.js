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
  });
});
