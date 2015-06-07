/**!
 * ali-rds - test/operator.test.js
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

const assert = require('assert');
const Operator = require('../lib/operator');

describe('operator.test.js', function () {
  describe('_where(where)', function () {
    it('should get where sql', function () {
      let op = new Operator();
      assert.equal(op._where({ id: 1 }), ' WHERE `id` = 1');
      assert.equal(op._where({ id: 1, name: 'foo' }), ' WHERE `id` = 1 AND `name` = \'foo\'');
      assert.equal(op._where({ id: 1, name2: null }), ' WHERE `id` = 1 AND `name2` = NULL');
      assert.equal(op._where({ 'test.id': 1 }), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ 'id': [1, 2], name: 'foo' }), ' WHERE `id` IN (1, 2) AND `name` = \'foo\'');
      assert.equal(op._where({ 'id': [1], name: 'foo' }, ['id', 'name']), ' WHERE `id` IN (1) AND `name` = \'foo\'');
      // assert.equal(op.where({ 'test.id': new Date(), name: 'foo' }, 'test.id'), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ name: 'foo\'\"' }), ' WHERE `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"' }), ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"', user: 'fengmk2' }),
        ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\' AND `user` = \'fengmk2\'');
    });
  });

  describe('format()', function () {
    it('should get literal string', function () {
      let op = new Operator();
      assert.equal(op.format('SET ?? = ?', ['dt', op.literals.now], true), 'SET `dt` = now()');
    });
  });

  describe('_query()', function () {
    it('should throw error when SubClass not impl', function* () {
      let op = new Operator();
      try {
        yield op.query('foo');
      } catch (err) {
        assert.equal(err.message, 'SubClass must impl this');
      }
    });
  });
});
