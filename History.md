
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
