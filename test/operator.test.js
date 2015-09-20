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
const rds = require('..');
const config = require('./config');
const Operator = require('../lib/operator');

describe('operator.test.js', function () {
  const prefix = 'prefix-' + process.version + '-';
  const table = 'user';
  before(function* () {
    this.db = rds(config);
    yield this.db.query('delete from ?? where name like ?', [table, prefix + '%']);
  });

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
        assert.equal(err.message.indexOf('SubClass must impl this'), 0);
      }
    });
  });

  describe('updateRows()', function() {
    before(function* () {
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [table, prefix + 'luckydrq', prefix + 'drqzju@gmail.com']);
      yield this.db.query('insert into ??(name, email, gmt_create, gmt_modified) \
        values(?, ?, now(), now())',
        [table, prefix + 'luckydrq2', prefix + 'drqzju@gmail.com']);
    });

    it('should update multiple rows', function* () {
      let rows = yield this.db.query('select * from ?? where email=? order by id',
        [table, prefix + 'drqzju@gmail.com']);
      console.log(rows);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].name, prefix + 'luckydrq');
      assert.equal(rows[1].name, prefix + 'luckydrq2');

      rows[0].name = prefix + 'drq';
      rows[1].email = prefix + 'drqzju@gmail2.com';
      yield this.db.updateRows(table, rows);
      let updatedRows = yield this.db.query('select * from ?? where id in (?, ?)',
        [table, rows[0].id, rows[1].id]);
        console.log(updatedRows);
      assert.equal(updatedRows[0].name, prefix + 'drq');
      assert.equal(updatedRows[1].email, prefix + 'drqzju@gmail2.com');
    });
  });
});
