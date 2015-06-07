/**!
 * ali-rds - test/sqlstring.test.js
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
var mysql = require('mysql');
var SqlString = require('../lib/sqlstring');
var literals = require('../lib/literals');

describe('sqlstring.test.js', function () {
  describe('escape()', function () {
    it('should patch escape to support Literal class', function () {
      assert.equal(SqlString.escape(literals.now), 'now()');
      assert.equal(SqlString.escape(new literals.Literal('sum')), 'sum');
      assert.equal(SqlString.escape(literals.Literal('sum2()')), 'sum2()');
      assert.equal(SqlString.escape(literals.now), mysql.escape(literals.now));
    });
  });
});
