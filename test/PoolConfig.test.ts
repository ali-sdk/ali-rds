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
  let newConnectionCount = 0;
  before(async () => {
    db = new RDSClient({
      // test getConnectionConfig
      connectionLimit: 2,
      getConnectionConfig() {
        console.log('get connection config index: %d', ++index);
        return config;
      },
    });
    db.pool.on('acquire', conn => {
      console.log('acquire connection %o', conn.threadId);
    });
    db.pool.on('connection', conn => {
      newConnectionCount++;
      console.log('new connection %o', conn.threadId);
    });
    db.pool.on('enqueue', () => {
      console.log('Waiting for available connection slot');
    });
    db.pool.on('release', conn => {
      console.log('release connection %o', conn.threadId);
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
      const rows = await db.query('show tables');
      // console.log(rows);
      assert(rows);
      assert(Array.isArray(rows));
      assert.equal(index, 2);
      const results = await Promise.all([
        db.query('show tables'),
        db.query('show tables'),
        db.query('show tables'),
      ]);
      assert.equal(results.length, 3);
      assert(results[0]);
      assert(Array.isArray(results[0]));
      assert(results[1]);
      assert(Array.isArray(results[1]));
      assert(results[2]);
      assert(Array.isArray(results[2]));
      assert.equal(index, 3);
      assert.equal(newConnectionCount, 2);
    });
  });
});
