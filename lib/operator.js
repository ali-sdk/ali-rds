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

var debug = require('debug')('ali-rds:operator');
var SqlString = require('./sqlstring');
var literals = require('./literals');

module.exports = Operator;

function Operator() {

}

var proto = Operator.prototype;

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

proto.query = function (sql, values) {
  // query(sql, values)
  if (arguments.length >= 2) {
    sql = this.format(sql, values);
  }
  return this._query(sql);
};

proto._query = function (/* sql */) {
  throw new Error('SubClass must impl this');
};

/**
 * List a table rows with options
 *
 * @param  {String} table     table name
 * @param  {Object} [options] optional params
 *  - {Object} where          query condition object
 *  - {Array|String} columns  select columns, default is `'*'`
 *  - {Array|String} orders   result rows sort condition
 *  - {Number} limit          result limit count, default is no limit
 *  - {Number} offset         result offset, default is `0`
 * @return {Object|Array}     query result
 */
proto.list = function* (table, options) {
  options = options || {};
  var sql = this._selectColumns(table, options.columns) +
    this._where(options.where) +
    this._orders(options.orders) +
    this._limit(options.limit, options.offset);
  debug('list(%j, %j) \n=> %j', table, options, sql);
  return yield this.query(sql);
};

proto.get = function* (table, where, options) {
  options = options || {};
  options.where = where;
  options.limit = 1;
  options.offset = 0;
  var rows = yield this.list(table, options);
  if (!Array.isArray(rows)) {
    rows = rows.rows;
  }
  return rows && rows[0] || null;
};

proto.insert = function* (table, obj, options) {
  options = options || {};
  if (!options.columns) {
    options.columns = Object.keys(obj);
  }
  var values = [];
  for (var i = 0; i < options.columns.length; i++) {
    values.push(obj[options.columns[i]]);
  }
  var sql = this.format('INSERT INTO ??(??) VALUES(?);', [table, options.columns, values]);
  debug('insert(%j, %j, %j) \n=> %j', table, obj, options, sql);
  return yield this.query(sql);
};

proto.update = function* (table, obj, options) {
  options = options || {};
  if (!options.columns) {
    options.columns = Object.keys(obj);
  }
  if (!options.where) {
    if (!('id' in obj)) {
      throw new Error('Can\'t not auto detect update condition, please set options.where, or make sure obj.id exists');
    }
    options.where = {
      id: obj.id
    };
  }

  var sets = [];
  var values = [];
  for (var i = 0; i < options.columns.length; i++) {
    var column = options.columns[i];
    if (column in options.where) {
      continue;
    }
    sets.push('?? = ?');
    values.push(column);
    values.push(obj[column]);
  }
  var sql = this.format('UPDATE ?? SET ', [table]) +
    this.format(sets.join(', '), values) +
    this._where(options.where);
  debug('update(%j, %j, %j) \n=> %j', table, obj, options, sql);
  return yield this.query(sql);
};

proto._where = function (where) {
  if (!where) {
    return '';
  }

  var wheres = [];
  var values = [];
  for (var key in where) {
    var value = where[key];
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
  var sql;
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
  var values = [];
  for (var i = 0; i < orders.length; i++) {
    var value = orders[i];
    if (typeof value === 'string') {
      values.push(this.escapeId(value));
    } else if (Array.isArray(value)) {
      // value format: ['name', 'desc'], ['name'], ['name', 'asc']
      var sort = String(value[1]).toUpperCase();
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
