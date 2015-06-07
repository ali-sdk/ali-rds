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

Aliyun RDS client.

Sub module of [ali-sdk](https://github.com/ali-sdk/ali-sdk).

## Usage

@see [RDS Usage on ali-sdk](https://github.com/ali-sdk/ali-sdk/blob/master/docs/rds.md)

## API

`*` Meaning this function is a thunk.

### IO queries

- *query(sql[, values])
- *list(table, options)
- *get(table, where, options)
- *insert(table, obj, options)
- *update(table, obj, options)

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

## License

[MIT](LICENSE)
