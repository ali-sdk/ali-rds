# ali-rds

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/ali-sdk/ali-rds/actions/workflows/nodejs.yml/badge.svg)](https://github.com/ali-sdk/ali-rds/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/ali-rds.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ali-rds
[codecov-image]: https://codecov.io/github/ali-sdk/ali-rds/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/ali-sdk/ali-rds?branch=master
[download-image]: https://img.shields.io/npm/dm/ali-rds.svg?style=flat-square
[download-url]: https://npmjs.org/package/ali-rds

Aliyun RDS client.
RDS, Relational Database Service. Equal to well know Amazon [RDS](http://aws.amazon.com/rds/).

Support `MySQL` protocol only.

## Usage

### Create RDS instance

```ts
import { RDSClient } from 'ali-rds';

const db = new RDSClient({
  host: 'your-rds-address.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'your-username',
  password: 'your-password',
  database: 'your-database-name',
  // optional params
  // The charset for the connection.
  // This is called "collation" in the SQL-level of MySQL (like utf8_general_ci).
  // If a SQL-level charset is specified (like utf8mb4)
  // then the default collation for that charset is used. (Default: 'UTF8_GENERAL_CI')
  // charset: 'utf8_general_ci',
  //
  // The maximum number of connections to create at once. (Default: 10)
  // connectionLimit: 10,
  //
  // The maximum number of connection requests the pool will queue
  // before returning an error from getConnection.
  // If set to 0, there is no limit to the number of queued connection requests. (Default: 0)
  // queueLimit: 0,
});
```

### Insert

- Insert one row

```js
const row = {
  name: 'fengmk2',
  otherField: 'other field value',
  createdAt: db.literals.now, // `now()` on db server
  // ...
};
const result = await db.insert('table-name', row);
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 3710,
  serverStatus: 2,
  warningCount: 2,
  message: '',
  protocol41: true,
  changedRows: 0 }
```

- Insert multi rows

Will execute under a transaction and auto commit.

```js
const rows = [
  {
    name: 'fengmk1',
    otherField: 'other field value',
    createdAt: db.literals.now, // `now()` on db server
    // ...
  },
  {
    name: 'fengmk2',
    otherField: 'other field value',
    createdAt: db.literals.now, // `now()` on db server
    // ...
  },
  // ...
];

const results = await db.insert('table-name', rows);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 3840,
  serverStatus: 2,
  warningCount: 2,
  message: '&Records: 2  Duplicates: 0  Warnings: 0',
  protocol41: true,
  changedRows: 0 }
```

### Update

- Update a row with primary key: `id`

```js
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
const result = await db.update('table-name', row);
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 1  Changed: 1  Warnings: 0',
  protocol41: true,
  changedRows: 1 }
```

- Update a row with `options.where` and `options.columns`

```js
const row = {
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
const result = await db.update('table-name', row, {
  where: { name: row.name },
  columns: [ 'otherField', 'modifiedAt' ]
});
console.log(result);
{ fieldCount: 0,
  affectedRows: 1,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 1  Changed: 1  Warnings: 0',
  protocol41: true,
  changedRows: 1 }
```

### Update multiple rows

- Update multiple rows with primary key: `id`

```js
const options = [{
  id: 123,
  name: 'fengmk2',
  email: 'm@fengmk2.com',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
}, {
   id: 124,
  name: 'fengmk2_2',
  email: 'm@fengmk2_2.com',
  otherField: 'other field value 2',
  modifiedAt: db.literals.now, // `now()` on db server
}]
const result = await db.updateRows('table-name', options);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 2  Changed: 2  Warnings: 0',
  protocol41: true,
  changedRows: 2 }
```

- Update multiple rows with `row` and `where` properties

```js
const options = [{
  row: {
    email: 'm@fengmk2.com',
    otherField: 'other field value',
    modifiedAt: db.literals.now, // `now()` on db server
  },
  where: {
    id: 123,
    name: 'fengmk2',
  }
}, {
  row: {
    email: 'm@fengmk2_2.com',
    otherField: 'other field value2',
    modifiedAt: db.literals.now, // `now()` on db server
  }, 
  where: {
    id: 124,
    name: 'fengmk2_2',
  }
}]
const result = await db.updateRows('table-name', options);
console.log(result);
{ fieldCount: 0,
  affectedRows: 2,
  insertId: 0,
  serverStatus: 2,
  warningCount: 0,
  message: '(Rows matched: 2  Changed: 2  Warnings: 0',
  protocol41: true,
  changedRows: 2 }
```

### Get

- Get a row

```js
const row = await db.get('table-name', { name: 'fengmk2' });

=> SELECT * FROM `table-name` WHERE `name` = 'fengmk2'
```

### Select

- Select all rows

```js
const rows = await db.select('table-name');

=> SELECT * FROM `table-name`
```

- Select rows with condition

```js
const rows = await db.select('table-name', {
  where: {
    type: 'javascript'
  },
  columns: ['author', 'title'],
  orders: [['id', 'desc']]
});

=> SELECT `author`, `title` FROM `table-name`
 WHERE `type` = 'javascript' ORDER BY `id` DESC
```

### Delete

- Delete with condition

```js
const result = await db.delete('table-name', {
  name: 'fengmk2'
});

=> DELETE FROM `table-name` WHERE `name` = 'fengmk2'
```

### Count

- Get count from a table with condition

```js
const count = await db.count('table-name', {
  type: 'javascript'
});

=> SELECT COUNT(*) AS count FROM `table-name` WHERE `type` = 'javascript';
```

### Transactions

beginTransaction, commit or rollback

```js
const tran = await db.beginTransaction();

try {
  await tran.insert(table, row1);
  await tran.update(table, row2);
  await tran.commit();
} catch (err) {
  // error, rollback
  await tran.rollback(); // rollback call won't throw err
  throw err;
}
```

#### Transaction with scope

API: `async beginTransactionScope(scope)`

All query run in scope will under a same transaction.
We will auto commit or rollback for you.

```js
const result = await db.beginTransactionScope(async conn => {
  // don't commit or rollback by yourself
  await conn.insert(table, row1);
  await conn.update(table, row2);
  return { success: true };
});
// if error throw on scope, will auto rollback
```

#### Transaction on koa

API: `async beginTransactionScope(scope, ctx)`

Use koa's context to make sure only one active transaction on one ctx.

```js
async function foo(ctx, data1) {
  return await db.beginTransactionScope(async conn => {
    await conn.insert(table1, data1);
    return { success: true };
  }, ctx);
}

async function bar(ctx, data2) {
  return await db.beginTransactionScope(async conn => {
    // execute foo with the same transaction scope
    await foo(ctx, { foo: 'bar' });
    await conn.insert(table2, data2);
    return { success: true };
  }, ctx);
}
```

### Raw Queries

- Query without arguments

```js
const rows = await db.query('SELECT * FROM your_table LIMIT 100');
console.log(rows);
```

- Query with array arguments

```js
const rows = await db.query('SELECT * FROM your_table WHERE id=?', [ 123 ]);
console.log(rows);
```

- Query with object arguments

```js
const rows = await db.query('SELECT * FROM your_table WHERE id=:id', { id: 123 });
console.log(rows);
```

### Custom query lifecricle

```ts
db.beforeQuery((sql: string) => {
  // change sql string
  return `/* add custom format here */ ${sql}`;
});

db.afterQuery((sql: string, result: any, execDuration: number, err?: Error) => {
  // handle logger here
});
```

## APIs

- `*` Meaning this function is yieldable.

### IO queries

- async query(sql[, values)
- async queryOne(sql[, values)
- async select(table, options)
- async get(table, where, options)
- async insert(table, row[s], options)
- async update(table, row, options)
- async updateRows(table, options)
- async delete(table, where)
- async count(table, where)

### Transactions Helpers

- async beginTransaction()
- async beginTransactionScope(scope)

### Utils

- escape(value, stringifyObjects, timeZone)
- escapeId(value, forbidQualified)
- format(sql, values, stringifyObjects, timeZone)

### Literals

```js
await db.insert('user', {
  name: 'fengmk2',
  createdAt: db.literals.now,
});

=>

INSERT INTO `user` SET `name` = 'fengmk2', `createdAt` = now()
```

#### Custom Literal

```js
const session = new db.literals.Literal('session()');
```

## License

[MIT](LICENSE)

<!-- GITCONTRIBUTOR_START -->

## Contributors

|[<img src="https://avatars.githubusercontent.com/u/156269?v=4" width="100px;"/><br/><sub><b>fengmk2</b></sub>](https://github.com/fengmk2)<br/>|[<img src="https://avatars.githubusercontent.com/u/985607?v=4" width="100px;"/><br/><sub><b>dead-horse</b></sub>](https://github.com/dead-horse)<br/>|[<img src="https://avatars.githubusercontent.com/u/32174276?v=4" width="100px;"/><br/><sub><b>semantic-release-bot</b></sub>](https://github.com/semantic-release-bot)<br/>|[<img src="https://avatars.githubusercontent.com/u/6587734?v=4" width="100px;"/><br/><sub><b>AntiMoron</b></sub>](https://github.com/AntiMoron)<br/>|[<img src="https://avatars.githubusercontent.com/u/10287125?v=4" width="100px;"/><br/><sub><b>nodejh</b></sub>](https://github.com/nodejh)<br/>|[<img src="https://avatars.githubusercontent.com/u/4192962?v=4" width="100px;"/><br/><sub><b>fangk</b></sub>](https://github.com/fangk)<br/>|
| :---: | :---: | :---: | :---: | :---: | :---: |
[<img src="https://avatars.githubusercontent.com/u/1619030?v=4" width="100px;"/><br/><sub><b>xujihui1985</b></sub>](https://github.com/xujihui1985)<br/>|[<img src="https://avatars.githubusercontent.com/u/1468366?v=4" width="100px;"/><br/><sub><b>csbun</b></sub>](https://github.com/csbun)<br/>|[<img src="https://avatars.githubusercontent.com/u/360661?v=4" width="100px;"/><br/><sub><b>popomore</b></sub>](https://github.com/popomore)<br/>|[<img src="https://avatars.githubusercontent.com/u/12378108?v=4" width="100px;"/><br/><sub><b>hoythan</b></sub>](https://github.com/hoythan)<br/>|[<img src="https://avatars.githubusercontent.com/u/35927028?v=4" width="100px;"/><br/><sub><b>deadhorse123</b></sub>](https://github.com/deadhorse123)<br/>|[<img src="https://avatars.githubusercontent.com/u/6897780?v=4" width="100px;"/><br/><sub><b>killagu</b></sub>](https://github.com/killagu)<br/>

This project follows the git-contributor [spec](https://github.com/xudafeng/git-contributor), auto updated at `Sat Mar 04 2023 18:57:33 GMT+0800`.

<!-- GITCONTRIBUTOR_END -->
