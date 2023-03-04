# Changelog

## [4.1.0](https://github.com/ali-sdk/ali-rds/compare/v4.0.3...v4.1.0) (2023-01-01)


### Features

* add unlock/lock tables ([#97](https://github.com/ali-sdk/ali-rds/issues/97)) ([4dc3452](https://github.com/ali-sdk/ali-rds/commit/4dc3452a375e0c242084e23c6e5f1cb76f1b647d))
* add unlock/lock tables ([#97](https://github.com/ali-sdk/ali-rds/issues/97)) ([0a61be6](https://github.com/ali-sdk/ali-rds/commit/0a61be6048db4df298bfff33c6d23bdcc0119b9a))

## [4.0.3](https://github.com/ali-sdk/ali-rds/compare/v4.0.2...v4.0.3) (2022-12-22)


### Bug Fixes

* export pool getter from rds client ([#102](https://github.com/ali-sdk/ali-rds/issues/102)) ([4048807](https://github.com/ali-sdk/ali-rds/commit/40488070b8bbae853a75ebe7d82a6cff6c8d071d))

## [4.0.2](https://github.com/ali-sdk/ali-rds/compare/v4.0.1...v4.0.2) (2022-12-22)


### Bug Fixes

* should export conn property ([#101](https://github.com/ali-sdk/ali-rds/issues/101)) ([37afa42](https://github.com/ali-sdk/ali-rds/commit/37afa420f3330cbc7a5e6e68da88086339a2a955))

---

4.0.1 / 2022-12-14
==================

**fixes**
  * [[`add4669`](http://github.com/ali-sdk/ali-rds/commit/add466917422b15deddd434c25595b6f6082bb6b)] - 🐛 FIX: Export db pool stats (#95) (fengmk2 <<fengmk2@gmail.com>>)

4.0.0 / 2022-12-14
==================

**features**
  * [[`6296b5b`](http://github.com/ali-sdk/ali-rds/commit/6296b5b1a0e08bf88097937a0b579a4c90b13a2d)] - 📦 NEW: [BREAKING] Refactor impl base on async/await (#94) (fengmk2 <<fengmk2@gmail.com>>)

3.4.1 / 2022-12-13
==================

**fixes**
  * [[`d983478`](http://github.com/ali-sdk/ali-rds/commit/d983478d40203357c71187c94f44ef3afab0b604)] - fix: handle concurrent transaction (#85) (killa <<killa123@126.com>>)

**others**
  * [[`61e8e38`](http://github.com/ali-sdk/ali-rds/commit/61e8e38208acf4a9cc1780128063318f7f0e17ac)] - Create codeql.yml (fengmk2 <<fengmk2@gmail.com>>)

3.4.0 / 2020-07-16
==================

**features**
  * [[`2e99ab8`](http://github.com/ali-sdk/ali-rds/commit/2e99ab8ce872b8482fe2b0a29af51a7a99aaff84)] - feat: export sqlstring method (#79) (Haoliang Gao <<sakura9515@gmail.com>>)

3.3.1 / 2019-04-24
==================

**fixes**
  * [[`52147de`](git@github.com:ali-sdk/ali-rds/commit/52147de9d7405b02efcf84ef28a11a4097675972)] - fix: query parameters are not allowed to be included in where (#67) (Hoyt <<hoythan@gmail.com>>)

**others**
  * [[`0f9f23b`](git@github.com:ali-sdk/ali-rds/commit/0f9f23bbd935650a1440537b18aaa982a6db2d44)] - chore: remove node 4 in ci (dead-horse <<dead_horse@qq.com>>)

3.3.0 / 2018-12-11
==================

**features**
  * [[`0d4d4ab`](http://github.com/ali-sdk/ali-rds/commit/0d4d4ab99a7cd655180f22d4d95e3cfef8c8714b)] - feat: where condition support NULL value (#60) (fengmk2 <<fengmk2@gmail.com>>)

3.2.0 / 2018-11-19
==================

**features**
  * [[`b227bc1`](http://github.com/ali-sdk/ali-rds/commit/b227bc12e5c6252264d4761b72f915b73d53c688)] - feat: support doomed transaction scope on test cases (#58) (AngrySean <<xujihui1985@gmail.com>>)

3.1.0 / 2018-09-30
==================

**features**
  * [[`859d818`](http://github.com/ali-sdk/ali-rds/commit/859d818d7e327d1ff590d363dfbf3135d8c90454)] - feat: update multiple rows (#55) (Hang Jiang <<jianghangscu@gmail.com>>)

**fixes**
  * [[`db6d596`](http://github.com/ali-sdk/ali-rds/commit/db6d59616f4b5083142bed554fb104c1b5a7c14e)] - fix: add default value now() of `gmt_modified` and `gmt_create` (#56) (Hang Jiang <<jianghangscu@gmail.com>>)

**others**
  * [[`db3524c`](http://github.com/ali-sdk/ali-rds/commit/db3524c8da7f8b32291695a2fc5497ea8fddd155)] - doc: add object arguments in readme (#52) (凯 方 <<fkvsssl@126.com>>)

3.0.1 / 2017-09-26
==================

**fixes**
  * [[`5ca4489`](http://github.com/ali-sdk/ali-rds/commit/5ca4489b903923302c81a8c9c8ac94c0afbce819)] - fix: don't redefined sqlstring.escape (#39) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`004713c`](http://github.com/ali-sdk/ali-rds/commit/004713cf9a4aa2da84a9f02348996b1a8ec82430)] - doc: fix typo 'Can\'t not' => 'Can not' (#34) (dreamswhite <<dreamswhite@aliyun.com>>)

3.0.0 / 2017-04-02
==================

  * feat: promiseify (#20)

2.7.0 / 2017-03-31
==================

  * feat: wrap generator function to promise (#19)

2.6.1 / 2017-01-20
==================

  * fix: `where` with empty object (#15)

2.6.0 / 2016-08-09
==================

  * feat: support query(sql, object) (#12)
  * test: use travis ci local mysql server (#13)

2.5.0 / 2016-06-07
==================

  * feat: support end()

2.4.0 / 2016-06-07
==================

  * feat: add queryOne api (#9)

2.3.1 / 2016-06-02
==================

  * fix: move sql to error stack (#8)

2.3.0 / 2016-05-15
==================

  * feat: support transaction on one request ctx (#7)

2.2.0 / 2016-01-13
==================

  * deps: mysql@2.10.2

2.1.0 / 2015-06-08
==================

 * feat: add *beginTransactionScope(scope)
 * docs: require ali-rds

2.0.0 / 2015-06-08
==================

 * test: only test on iojs-2
 * feat: add count(table, where)
 * refactor: use const and let instead of var
 * feat: add Transaction
 * feat: support insert multi rows
 * break: remove fields property from result
 * refactor: use options params style
 * feat: add get(), list(), insert(), update()

1.1.0 / 2015-06-02
==================

 * test: improve test coverage
 * test: make sure name prefix is different
 * feat: add options.needFields, default is true

1.0.0 / 2015-02-25
==================

 * first release, only support MySQL
