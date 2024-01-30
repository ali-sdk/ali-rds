import { strict as assert } from 'node:assert';
import mysql from 'mysql2';
import { SqlString } from '../src/sqlstring';
import literals, { Literal } from '../src/literals';

describe('test/sqlstring.test.ts', () => {
  describe('escape()', () => {
    it('should patch escape to support Literal class', () => {
      assert.equal(SqlString.escape(literals.now), 'now()');
      assert.equal(SqlString.escape(new literals.Literal('sum')), 'sum');
      assert.equal(SqlString.escape(new Literal('sum2()')), 'sum2()');
      // assert.equal(SqlString.escape(literals.Literal('sum2()')), 'sum2()');
      assert.equal(SqlString.escape(literals.now), mysql.escape(literals.now));
    });

    it('should only patch once', () => {
      delete require.cache[require.resolve('../src/sqlstring')];
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AnotherSqlString = require('../src/sqlstring').SqlString;
      assert.equal(AnotherSqlString, SqlString);
      assert.equal(AnotherSqlString.escape(literals.now), 'now()');
      assert.equal(AnotherSqlString.escape(new literals.Literal('sum')), 'sum');
      assert.equal(AnotherSqlString.escape(new Literal('sum2()')), 'sum2()');
      assert.equal(AnotherSqlString.escape(literals.now), mysql.escape(literals.now));
    });
  });
});
