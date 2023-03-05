import { strict as assert } from 'node:assert';
import { Operator } from '../src/operator';

class CustomOperator extends Operator {}

describe('test/operator.test.ts', () => {
  describe('_where(where)', () => {
    it('should get where sql', () => {
      const op = new CustomOperator();
      assert.equal(op._where(), '');
      assert.equal(op._where({}), '');
      assert.equal(op._where({ id: 1 }), ' WHERE `id` = 1');
      assert.equal(op._where({ id: 1, name: 'foo' }), ' WHERE `id` = 1 AND `name` = \'foo\'');
      assert.equal(op._where({ id: 1, name2: null }), ' WHERE `id` = 1 AND `name2` IS NULL');
      assert.equal(op._where({ id: 1, name3: undefined }), ' WHERE `id` = 1 AND `name3` IS NULL');
      assert.equal(op._where({ 'test.id': 1 }), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ id: [ 1, 2 ], name: 'foo' }), ' WHERE `id` IN (1, 2) AND `name` = \'foo\'');
      assert.equal(op._where({ id: [ 1 ], name: 'foo' }), ' WHERE `id` IN (1) AND `name` = \'foo\'');
      // assert.equal(op.where({ 'test.id': new Date(), name: 'foo' }, 'test.id'), ' WHERE `test`.`id` = 1');
      assert.equal(op._where({ name: 'foo\'\"' }), ' WHERE `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"' }), ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\'');
      assert.equal(op._where({ id: 1, name: 'foo\'\"', user: 'fengmk2' }),
        ' WHERE `id` = 1 AND `name` = \'foo\\\'\\\"\' AND `user` = \'fengmk2\'');
    });
  });

  describe('format()', () => {
    it('should get literal string', () => {
      const op = new CustomOperator();
      assert.equal(op.format('SET ?? = ?', [ 'dt', op.literals.now ], true), 'SET `dt` = now()');
    });

    it('should get literal string by string', () => {
      const op = new CustomOperator();
      assert.equal(op.format('SET name = ?', 'test'), 'SET name = \'test\'');
    });

    it('should get literal string by object', () => {
      const op = new CustomOperator();
      assert.equal(op.format('SET dt = :now and name = :name and age = :age', {
        now: op.literals.now,
        name: 'test',
      }), 'SET dt = now() and name = \'test\' and age = :age');
    });

    it('should get literal string by boundary', () => {
      const op = new CustomOperator();
      assert.equal(op.format('SET name = ?', null), 'SET name = ?');
      assert.equal(op.format('SET name = ?', undefined), 'SET name = ?');
      assert.equal(op.format('SET name = ?', 0), 'SET name = 0');
      assert.equal(op.format('SET name = ?', 1), 'SET name = 1');
      assert.equal(op.format('SET name = ?', 'foo'), 'SET name = \'foo\'');
      assert.equal(op.format('SET name = ?', true), 'SET name = true');
      assert.equal(op.format('SET name = ?', false), 'SET name = false');
    });
  });

  describe('_query()', () => {
    it('should throw error when SubClass not impl', async () => {
      const op = new CustomOperator();
      try {
        await op.query('foo');
      } catch (err) {
        assert.equal(err.message.indexOf('SubClass must impl this'), 0);
      }
    });
  });

  describe('beforeQuery(), afterQuery()', () => {
    class CustomOperator extends Operator {
      protected async _query(sql: string): Promise<any> {
        // console.log(sql);
        if (sql === 'error') throw new Error('mock error');
        return { sql };
      }
    }

    it('should override query sql', async () => {
      const op = new CustomOperator();
      op.beforeQuery(sql => {
        return `hello ${sql}`;
      });
      const result = await op.query('foo');
      assert.equal(result.sql, 'hello foo');
    });

    it('should not override query sql', async () => {
      const op = new CustomOperator();
      op.beforeQuery(sql => {
        assert(sql);
      });
      const result = await op.query('foo');
      assert.equal(result.sql, 'foo');
    });

    it('should get query result on after hook', async () => {
      const op = new CustomOperator();
      op.afterQuery((sql, result, execDuration, err) => {
        assert.equal(sql, 'foo');
        assert.deepEqual(result, { sql });
        assert.equal(typeof execDuration, 'number');
        assert(execDuration >= 0);
        assert.equal(err, undefined);
      });
      const result = await op.query('foo');
      assert.equal(result.sql, 'foo');
    });

    it('should get query error on after hook', async () => {
      const op = new CustomOperator();
      op.afterQuery((sql, result, execDuration, err) => {
        assert.equal(sql, 'error');
        assert.equal(result, null);
        assert.equal(typeof execDuration, 'number');
        assert(execDuration >= 0);
        assert(err instanceof Error);
        assert.equal(err.message, 'mock error');
        assert.match(err.stack!, /sql: error/);
      });
      await assert.rejects(async () => {
        await op.query('error');
      }, (err: any) => {
        assert.equal(err.message, 'mock error');
        assert.match(err.stack, /sql: error/);
        return true;
      });
    });
  });
});
