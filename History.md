
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
