/**!
 * ali-rds - test/operator.test.js
 *
 * Copyright(c) fengmk2 and other contributors.
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
var Operator = require('../lib/operator');

describe('operator.test.js', function () {
  describe('_where()', function () {
    it('should get where sql', function () {
      var op = new Operator();
      assert.equal(op._where({ id: 1, name: 'foo' }), ' WHERE `id` = 1');
      assert.equal(op._where({ id: 1, name: 'foo' }, 'id'), op._where({ id: 1, name: 'foo' }));
      assert.equal(op._where({ id: 1, name: 'foo' }, [ 'id' ]), op._where({ id: 1, name: 'foo' }));

      assert.equal(op._where({ id: 1, name: 'foo' }, [ 'id', 'name2' ]), ' WHERE `id` = 1 AND `name2` = NULL');

      assert.equal(op._where({ 'test.id': 1, name: 'foo' }, 'test.id'), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ 'id': [1, 2], name: 'foo' }, ['id', 'name']), ' WHERE `id` IN (1, 2) AND `name` = \'foo\'');
      assert.equal(op._where({ 'id': [1], name: 'foo' }, ['id', 'name']), ' WHERE `id` IN (1) AND `name` = \'foo\'');
      // assert.equal(op.where({ 'test.id': new Date(), name: 'foo' }, 'test.id'), ' WHERE `test`.`id` = 1');

      assert.equal(op._where({ id: 1, name: 'foo\'\"' }, 'name'), ' WHERE `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"' }, [ 'name' ]), op._where({ id: 1, name: 'foo\'\"' }, 'name'));

      assert.equal(op._where({ id: 1, name: 'foo\'\"' }, [ 'id', 'name' ]), ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"' }, [ 'name', 'id' ]), ' WHERE `name` = \'foo\\\'\\\"\' AND `id` = 1');
      assert.equal(op._where({ id: 1, name: 'foo\'\"', user: 'fengmk2' }, [ 'id', 'name', 'user' ]),
        ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\' AND `user` = \'fengmk2\'');
    });
  });
});
