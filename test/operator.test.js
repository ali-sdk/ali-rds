'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const Operator = require('../lib/operator');

describe('operator.test.js', function() {
  describe('_where(where)', function() {
    it('should get where sql', function() {
      const op = new Operator();
      assert.equal(op._where(), '');
      assert.equal(op._where({}), '');
      assert.equal(op._where({ id: 1 }), ' WHERE `id` = 1');
      assert.equal(op._where({ id: 1, name: 'foo' }), ' WHERE `id` = 1 AND `name` = \'foo\'');
      assert.equal(op._where({ id: 1, name2: null }), ' WHERE `id` = 1 AND `name2` IS NULL');
      assert.equal(op._where({ id: 1, name3: undefined }), ' WHERE `id` = 1 AND `name3` IS NULL');
      assert.equal(op._where({ 'test.id': 1 }), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ id: [ 1, 2 ], name: 'foo' }), ' WHERE `id` IN (1, 2) AND `name` = \'foo\'');
      assert.equal(op._where({ id: [ 1 ], name: 'foo' }, [ 'id', 'name' ]), ' WHERE `id` IN (1) AND `name` = \'foo\'');
      // assert.equal(op.where({ 'test.id': new Date(), name: 'foo' }, 'test.id'), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ name: 'foo\'\"' }), ' WHERE `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"' }), ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"', user: 'fengmk2' }),
        ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\' AND `user` = \'fengmk2\'');
    });
  });

  describe('format()', function() {
    it('should get literal string', function() {
      const op = new Operator();
      assert.equal(op.format('SET ?? = ?', [ 'dt', op.literals.now ], true), 'SET `dt` = now()');
    });

    it('should get literal string by string', function() {
      const op = new Operator();
      assert.equal(op.format('SET name = ?', 'test'), 'SET name = \'test\'');
    });

    it('should get literal string by object', function() {
      const op = new Operator();
      assert.equal(op.format('SET dt = :now and name = :name and age = :age', {
        now: op.literals.now,
        name: 'test',
      }), 'SET dt = now() and name = \'test\' and age = :age');
    });

    it('should get literal string by boundary', function() {
      const op = new Operator();
      assert.equal(op.format('SET name = ?', null), 'SET name = ?');
      assert.equal(op.format('SET name = ?', undefined), 'SET name = ?');
      assert.equal(op.format('SET name = ?', 0), 'SET name = 0');
      assert.equal(op.format('SET name = ?', 1), 'SET name = 1');
      assert.equal(op.format('SET name = ?', 'foo'), 'SET name = \'foo\'');
      assert.equal(op.format('SET name = ?', true), 'SET name = true');
      assert.equal(op.format('SET name = ?', false), 'SET name = false');
    });
  });

  describe('_query()', function() {
    it('should throw error when SubClass not impl', function* () {
      const op = new Operator();
      try {
        yield op.query('foo');
      } catch (err) {
        assert.equal(err.message.indexOf('SubClass must impl this'), 0);
      }
    });
  });
});
