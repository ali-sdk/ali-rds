ali-rds
=======

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Gittip][gittip-image]][gittip-url]
[![David deps][david-image]][david-url]
[![iojs version][iojs-image]][iojs-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/ali-rds.svg?style=flat-square
[npm-url]: https://npmjs.org/package/ali-rds
[travis-image]: https://img.shields.io/travis/ali-sdk/ali-rds.svg?style=flat-square
[travis-url]: https://travis-ci.org/ali-sdk/ali-rds
[coveralls-image]: https://img.shields.io/coveralls/ali-sdk/ali-rds.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/ali-sdk/ali-rds?branch=master
[gittip-image]: https://img.shields.io/gittip/fengmk2.svg?style=flat-square
[gittip-url]: https://www.gittip.com/fengmk2/
[david-image]: https://img.shields.io/david/ali-sdk/ali-rds.svg?style=flat-square
[david-url]: https://david-dm.org/ali-sdk/ali-rds
[iojs-image]: https://img.shields.io/badge/io.js-%3E=_1.0-yellow.svg?style=flat-square
[iojs-url]: http://iojs.org/
[node-image]: https://img.shields.io/badge/node.js-%3E=_0.10-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/ali-rds.svg?style=flat-square
[download-url]: https://npmjs.org/package/ali-rds

Aliyun RDS client. Sub module of [ali-sdk](https://github.com/ali-sdk/ali-sdk).

# RDS Usage

RDS, Relational Database Service. Equal to well know Amazon [RDS](http://aws.amazon.com/rds/).
Support `MySQL`, `SQL Server` and `PostgreSQL`.

## MySQL Usage

### Create RDS instance

```js
var rds = require('ali-sdk').rds;

var db = rds({
  host: 'your-rds-address.mysql.rds.aliyuncs.com',
  port: 3306,
  user: 'your-username',
  password: 'your-password',
  database: 'your-database-name',
  // The maximum number of connections to create at once. (Default: 10)
  // connectionLimit: 10,
});
```

### Insert

- Insert one row

```js
var row = {
  name: 'fengmk2',
  otherField: 'other field value',
  createdAt: db.literals.now, // `now()` on db server
  // ...
};
var result = yield db.insert('table-name', row);
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
var rows = [
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

var results = yield db.insert('table-name', rows);
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

### Transactions

- Get connection first

```js
var conn = yield db.getConnection();
```

- beginTransaction, commit or rollback

```js
var conn = yield db.getConnection();
try {
  yield conn.beginTransaction();
} catch (err) {
  conn.release();
  throw err;
}

try {
  yield conn.query(insertSQL1);
  yield conn.query(insertSQL2);
  yield conn.commit();
} catch (err) {
  // error, rollback
  yield conn.rollback(); // rollback call won't throw err
  throw err;
} finally {
  // should release connection whatever
  conn.release();
}
```

### Raw Queries

- Query with arguments

```js
var rows = yield db.query('SELECT * FROM your_table LIMIT 100');
console.log(rows);
```

- Query with arguments

```js
var rows = yield db.query('SELECT * FROM your_table WHERE id=?', [123]);
console.log(rows);
```

## SQL Server Usage

TBD

---

## APIs

`*` Meaning this function is yieldable.

### IO queries

- *query(sql[, values])
- *select(table, options)
- *get(table, where, options)
- *insert(table, obj, options)
- *update(table, obj, options)
- *delete(table, where)

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
var session = new db.literals.Literal('session()');
```

## TODO

- [ ] MySQL
  - [x] Pool
  - [ ] Cluster
- [ ] SQL Server
- [ ] PostgreSQL

## License

[MIT](LICENSE)
