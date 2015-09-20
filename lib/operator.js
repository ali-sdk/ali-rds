/**!
 * ali-rds - lib/operator.js
 *
 * Copyright(c) ali-sdk and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
const debug = require('debug')('ali-rds:operator');
const toArray = require('json-to-array');
const merge = require('array-merges');
const SqlString = require('./sqlstring');
const literals = require('./literals');

module.exports = Operator;

function Operator() {

}

const proto = Operator.prototype;

proto.literals = literals;

proto.escape = function (value, stringifyObjects, timeZone) {
  return SqlString.escape(value, stringifyObjects, timeZone);
};

proto.escapeId = function (value, forbidQualified) {
  return SqlString.escapeId(value, forbidQualified);
};

proto.format = function (sql, values, stringifyObjects, timeZone) {
  return SqlString.format(sql, values, stringifyObjects, timeZone);
};

proto.query = function* (sql, values) {
  // query(sql, values)
  if (arguments.length >= 2) {
    sql = this.format(sql, values);
  }
  debug('query %j', sql);
  try {
    return yield this._query(sql);
  } catch (err) {
    err.message += ' (sql: ' + sql + ')';
    debug('query error: %s', err);
    throw err;
  }
};

proto._query = function (/* sql */) {
  throw new Error('SubClass must impl this');
};

proto.count = function* (table, where) {
  let sql = this.format('SELECT COUNT(*) as count FROM ??', [table]) +
    this._where(where);
  debug('count(%j, %j) \n=> %j', table, where, sql);
  let rows = yield this.query(sql);
  return rows[0].count;
};

/**
 * Select rows from a table
 *
 * @param  {String} table     table name
 * @param  {Object} [options] optional params
 *  - {Object} where          query condition object
 *  - {Array|String} columns  select columns, default is `'*'`
 *  - {Array|String} orders   result rows sort condition
 *  - {Number} limit          result limit count, default is no limit
 *  - {Number} offset         result offset, default is `0`
 * @return {Array} result rows
 */
proto.select = function* (table, options) {
  options = options || {};
  let sql = this._selectColumns(table, options.columns) +
    this._where(options.where) +
    this._orders(options.orders) +
    this._limit(options.limit, options.offset);
  debug('select(%j, %j) \n=> %j', table, options, sql);
  return yield this.query(sql);
};

proto.get = function* (table, where, options) {
  options = options || {};
  options.where = where;
  options.limit = 1;
  options.offset = 0;
  let rows = yield this.select(table, options);
  return rows && rows[0] || null;
};

proto.insert = function* (table, rows, options) {
  options = options || {};
  let firstObj;
  // insert(table, rows)
  if (Array.isArray(rows)) {
    firstObj = rows[0];
  } else {
    // insert(table, row)
    firstObj = rows;
    rows = [rows];
  }
  if (!options.columns) {
    options.columns = Object.keys(firstObj);
  }

  let params = [table, options.columns];
  let strs = [];
  for (let i = 0; i < rows.length; i++) {
    let values = [];
    let row = rows[i];
    for (let j = 0; j < options.columns.length; j++) {
      values.push(row[options.columns[j]]);
    }
    strs.push('(?)');
    params.push(values);
  }

  let sql = this.format('INSERT INTO ??(??) VALUES' + strs.join(', '), params);
  debug('insert(%j, %j, %j) \n=> %j', table, rows, options, sql);
  return yield this.query(sql);
};

proto.update = function* (table, row, options) {
  // TODO: support multi rows
  options = options || {};
  if (!options.columns) {
    options.columns = Object.keys(row);
  }
  if (!options.where) {
    if (!('id' in row)) {
      throw new Error('Can\'t not auto detect update condition, please set options.where, or make sure obj.id exists');
    }
    options.where = {
      id: row.id
    };
  }

  let sets = [];
  let values = [];
  for (let i = 0; i < options.columns.length; i++) {
    let column = options.columns[i];
    if (column in options.where) {
      continue;
    }
    sets.push('?? = ?');
    values.push(column);
    values.push(row[column]);
  }
  let sql = this.format('UPDATE ?? SET ', [table]) +
    this.format(sets.join(', '), values) +
    this._where(options.where);
  debug('update(%j, %j, %j) \n=> %j', table, row, options, sql);
  return yield this.query(sql);
};

/**
 * Update multiple rows from a table
 * @see http://stackoverflow.com/questions/2528181/update-multiple-rows-with-one-query
 *
 * @param  {String} table     table name
 * @param  {Array} rows       row obj with a primary key `id`
 * @return {Object} result
 */
proto.updateRows = function* (table, rows) {
  if (!Array.isArray(rows)) {
    rows = [rows];
  }

  let escape = this.escape;
  let escapeId = this.escapeId;
  let ids = [];
  let rowArr = rows
    .map(function(row) {
      // {a: b, c: d} => [[a, b], [c, d]]
      if (!row.hasOwnProperty('id')) {
        throw new Error('Can\' update rows. Make sure each row has a id');
      }

      // escape first
      row.id = escape(row.id);
      ids.push(row.id);
      return toArray(row, { excepts: ['id'] });
    })
    .reduce(function(prev, curr) {
      // merge([[a, b]], [[a, c]]) => [[a, [b, c]]]
      prev = merge(prev, curr, {
        equal: equal,
        onMerge: onMerge
      });
      return prev;
    }, []);

  function equal(prev, next) {
    return prev[0] === next[0];
  }

  function onMerge(prev, next) {
    if (Array.isArray(prev[1])) {
      prev[1].push(next[1]);
    } else {
      prev[1] = [prev[1], next[1]];
    }
    return [[prev[0], prev[1]]];
  }

  // id 查找规则。多条记录可能拥有相同的key, value。
  // 通过{id}_{key}做key，是唯一的。
  let idMap = {};
  function getId(key, value) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][key] === value) {
        let hashKey = rows[i].id + '_' + key;
        if (idMap[hashKey]) {
          continue;
        } else {
          idMap[hashKey] = true;
          return rows[i].id;
        }
      }
    }
    return null;
  }

  let clauseTemplate = 'UPDATE %s SET %s WHERE id IN (%s)';
  let subClauseTemplate = '%s = CASE id %s END';
  let loopClauseTemplate = 'WHEN %s THEN %s';
  let clauseArr = [];
  table = escapeId(table);
  rowArr.forEach(function(tuple) {
    let key = tuple[0], values = Array.isArray(tuple[1]) ? tuple[1] : [tuple[1]];
    let loopArr = [];
    values.forEach(function(value) {
      let id = getId(key, value);
      if (id) {
        value = escape(value);
        loopArr.push(util.format(loopClauseTemplate, id, value));
      }
    });
    clauseArr.push(util.format(subClauseTemplate, escapeId(key), loopArr.join(' ')));
  });
  let sql = util.format(clauseTemplate, table, clauseArr.join(','), ids.join(','));
  debug('update(%j, %j, %j) \n=> %j', table, JSON.stringify(rows), sql);
  return yield this.query(sql);
};

proto.delete = function* (table, where) {
  let sql = this.format('DELETE FROM ??', [table]) +
    this._where(where);
  debug('delete(%j, %j) \n=> %j', table, where, sql);
  return yield this.query(sql);
};

proto._where = function (where) {
  if (!where) {
    return '';
  }

  let wheres = [];
  let values = [];
  for (let key in where) {
    let value = where[key];
    if (Array.isArray(value)) {
      wheres.push('?? IN (?)');
    } else {
      wheres.push('?? = ?');
    }
    values.push(key);
    values.push(value);
  }
  return this.format(' WHERE ' + wheres.join(' AND '), values);
};

proto._selectColumns = function (table, columns) {
  if (!columns) {
    columns = '*';
  }
  let sql;
  if (columns === '*') {
    sql = this.format('SELECT * FROM ??', [table]);
  } else {
    sql = this.format('SELECT ?? FROM ??', [columns, table]);
  }
  return sql;
};

proto._orders = function (orders) {
  if (!orders) {
    return '';
  }
  if (typeof orders === 'string') {
    orders = [ orders ];
  }
  let values = [];
  for (let i = 0; i < orders.length; i++) {
    let value = orders[i];
    if (typeof value === 'string') {
      values.push(this.escapeId(value));
    } else if (Array.isArray(value)) {
      // value format: ['name', 'desc'], ['name'], ['name', 'asc']
      let sort = String(value[1]).toUpperCase();
      if (sort !== 'ASC' && sort !== 'DESC') {
        sort = null;
      }
      if (sort) {
        values.push(this.escapeId(value[0]) + ' ' + sort);
      } else {
        values.push(this.escapeId(value[0]));
      }
    }
  }
  return ' ORDER BY ' + values.join(', ');
};

proto._limit = function (limit, offset) {
  if (!limit || typeof limit !== 'number') {
    return '';
  }
  if (typeof offset !== 'number') {
    offset = 0;
  }
  return ' LIMIT ' + offset + ', ' + limit;
};
