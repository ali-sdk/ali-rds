/**!
 * ali-rds - lib/operator.js
 *
 * Copyright(c) fengmk2 and other contributors.
 * MIT Licensed
 *
 * Authors:
 *   fengmk2 <m@fengmk2.com> (http://fengmk2.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var mysql = require('mysql');

module.exports = Operator;

function Operator() {

}

var proto = Operator.prototype;

proto.escape = function (value, stringifyObjects, timeZone) {
  return mysql.escape(value, stringifyObjects, timeZone);
};

proto.escapeId = function (value, forbidQualified) {
  return mysql.escapeId(value, forbidQualified);
};

proto.format = function (sql, values, stringifyObjects, timeZone) {
  return mysql.format(sql, values, stringifyObjects, timeZone);
};

proto.query = function () {
  throw new Error('Not Impl');
};

proto.list = function* (table, obj, keys, columns, orders, limit, offset) {
  var sql = this._selectColumns(table, columns) + this._where(obj, keys) + this._orders(orders)
    + this._limit(limit, offset) + ';';
  return yield this.query(sql);
};

proto.get = function* (table, obj, keys, columns, orders) {
  var rows = yield this.list(table, obj, keys, columns, orders, 1);
  if (!Array.isArray(rows)) {
    rows = rows.rows;
  }
  return rows && rows[0] || null;
};

proto.insert = function* (table, obj, columns) {
  if (!columns) {
    columns = Object.keys(obj);
  }
  var values = [];
  for (var i = 0; i < columns.length; i++) {
    values.push(obj[columns[i]]);
  }
  var sql = this.format('INSERT INTO ??(??) VALUES(?);', [table, columns, values]);
  return yield this.query(sql);
};

proto.update = function* (table, obj, keys, columns) {
  if (!columns) {
    columns = Object.keys(obj);
  }
  var sets = [];
  var values = [];
  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    if (keys.indexOf(column) >= 0) {
      continue;
    }
    sets.push('?? = ?');
    values.push(column);
    values.push(obj[column]);
  }
  var sql = this.format('UPDATE ?? SET ', [table]) + this.format(sets.join(', '), values) + this._where(obj, keys);
  return yield this.query(sql);
};

proto._where = function (obj, keys) {
  if (!keys) {
    keys = [ 'id' ];
  } else if (typeof keys === 'string') {
    keys = [ keys ];
  }
  var wheres = [];
  var values = [];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = obj[key];
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
