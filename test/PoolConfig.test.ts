import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import mm from 'mm';
import config from './config';
import { RDSClient } from '../src/client';

describe('test/PoolConfig.test.ts', () => {
  const prefix = 'prefix-PoolConfig' + process.version + '-';
  const table = 'ali-sdk-test-user';
  let db: RDSClient;
  let index = 0;
  before(async () => {
    db = new RDSClient({
      // test getConnectionConfig only once
      connectionLimit: 1,
      getConnectionConfig() {
        console.log('get connection config index: %d', ++index);
        return config;
      },
    });
    try {
      const sql = await fs.readFile(path.join(__dirname, 'rds_init.sql'), 'utf-8');
      await db.query(sql);
    } catch (err) {
      console.log('init table error: %s', err);
    }
    await db.query('delete from ?? where name like ?', [ table, prefix + '%' ]);
  });

  after(async () => {
    return await db.end();
  });

  afterEach(() => {
    mm.restore();
  });

  describe('new RDSClient(options.getConnectionConfig)', () => {
    it('should get connection config from newConnectionConfig()', async () => {
      assert.equal(db.pool.config.connectionConfig.database, undefined);
      assert.equal(index, 1);
      assert.equal((db.pool.config as any).newConnectionConfig().database, 'test');
      assert.equal(index, 2);
    });

    it('should connect rds success', async () => {
      let rows = await db.query('show tables');
      // console.log(rows);
      assert(rows);
      assert(Array.isArray(rows));
      rows = await db.query('show tables');
      // console.log(rows);
      assert(rows);
      assert(Array.isArray(rows));
      assert.equal(index, 2);
    });
  });
});
