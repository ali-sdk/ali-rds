ali-rds
=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/ali-rds.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ali-rds
[travis-image]: https://img.shields.io/travis/ali-sdk/ali-rds.svg?style=flat-square
[travis-url]: https://travis-ci.org/ali-sdk/ali-rds
[codecov-image]: https://codecov.io/github/ali-sdk/ali-rds/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/ali-sdk/ali-rds?branch=master
[david-image]: https://img.shields.io/david/ali-sdk/ali-rds.svg?style=flat-square
[david-url]: https://david-dm.org/ali-sdk/ali-rds
[download-image]: https://img.shields.io/npm/dm/ali-rds.svg?style=flat-square
[download-url]: https://npmjs.org/package/ali-rds

Aliyun RDS client. Sub module of [ali-sdk](https://github.com/ali-sdk/ali-sdk).

# RDS Usage

RDS, Relational Database Service. Equal to well know Amazon [RDS](http://aws.amazon.com/rds/).
Support `MySQL`, `SQL Server` and `PostgreSQL`.

## MySQL Usage

### Create RDS instance

```js
const rds = require('ali-rds');

const db = rds({
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
let row = {
  name: 'fengmk2',
  otherField: 'other field value',
  createdAt: db.literals.now, // `now()` on db server
  // ...
};
let result = yield db.insert('table-name', row);
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
let rows = [
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

let results = yield db.insert('table-name', rows);
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
let row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
let result = yield db.update('table-name', row);
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
let row = {
  name: 'fengmk2',
  otherField: 'other field value',
  modifiedAt: db.literals.now, // `now()` on db server
};
let result = yield db.update('table-name', row, {
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

-  Update multiple rows with primary key: `id`

```js
let options = [{
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
let result = yield db.updateRows('table-name', options);
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

-  Update multiple rows with `row` and `where` properties


```js
let options = [{
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
let result = yield db.updateRows('table-name', options);
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
let row = yield db.get('table-name', { name: 'fengmk2' });

=> SELECT * FROM `table-name` WHERE `name` = 'fengmk2'
```

### Select

- Select all rows

```js
let rows = yield db.select('table-name');

=> SELECT * FROM `table-name`
```

- Select rows with condition

```js
let rows = yield db.select('table-name', {
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
let result = yield db.delete('table-name', {
  name: 'fengmk2'
});

=> DELETE FROM `table-name` WHERE `name` = 'fengmk2'
```

### Count

- Get count from a table with condition

```js
let count = yield db.count('table-name', {
  type: 'javascript'
});

=> SELECT COUNT(*) AS count FROM `table-name` WHERE `type` = 'javascript';
```

### Transactions

beginTransaction, commit or rollback

```js
let tran = yield db.beginTransaction();

try {
  yield tran.insert(table, row1);
  yield tran.update(table, row2);
  yield tran.commit();
} catch (err) {
  // error, rollback
  yield tran.rollback(); // rollback call won't throw err
  throw err;
}
```

#### Transaction with scope

API: `*beginTransactionScope(scope)`

All query run in scope will under a same transaction.
We will auto commit or rollback for you.

```js
var result = yield db.beginTransactionScope(function* (conn) {
  // don't commit or rollback by yourself
  yield conn.insert(table, row1);
  yield conn.update(table, row2);
  return { success: true };
});
// if error throw on scope, will auto rollback
```

#### Transaction on koa

API: `*beginTransactionScope(scope, ctx)`

Use koa's context to make sure only one active transaction on one ctx.

```js
function* foo(ctx, data1) {
  return yield db.beginTransactionScope(function* (conn) {
    yield conn.insert(table1, data1);
    return { success: true };
  }, ctx);
}

function* bar(ctx, data2) {
  return yield db.beginTransactionScope(function* (conn) {
    // execute foo with the same transaction scope
    yield foo(ctx, { foo: 'bar' });
    yield conn.insert(table2, data2);
    return { success: true };
  }, ctx);
}
```

### Raw Queries

- Query without arguments

```js
let rows = yield db.query('SELECT * FROM your_table LIMIT 100');
console.log(rows);
```

- Query with array arguments

```js
let rows = yield db.query('SELECT * FROM your_table WHERE id=?', [ 123 ]);
console.log(rows);
```

- Query with object arguments

```js
let rows = yield db.query('SELECT * FROM your_table WHERE id=:id', { id: 123 });
console.log(rows);
```

## SQL Server Usage

TBD

---

## APIs

- `*` Meaning this function is yieldable.

### IO queries

- *query(sql[, values)
- *queryOne(sql[, values)
- *select(table, options)
- *get(table, where, options)
- *insert(table, row[s], options)
- *update(table, row, options)
- *updateRows(table, options)
- *delete(table, where)
- *count(table, where)

#### Transactions

- *beginTransaction()
- *beginTransactionScope(scope)

### Utils

- escape(value, stringifyObjects, timeZone)
- escapeId(value, forbidQualified)
- format(sql, values, stringifyObjects, timeZone)

### Literals

```js
yield db.insert('user', {
  name: 'fengmk2',
  createdAt: db.literals.now,
});

=>

INSERT INTO `user` SET `name` = 'fengmk2', `createdAt` = now()
```

#### Custom Literal

```js
let session = new db.literals.Literal('session()');
```

## TODO

- [x] MySQL
  - [x] Pool
  - [ ] Cluster
- [ ] SQL Server
- [ ] PostgreSQL

## License

[MIT](LICENSE)
