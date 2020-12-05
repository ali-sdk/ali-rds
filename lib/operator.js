'use strict';

/**
 * Module dependencies.
 */

const debug = require('debug')('ali-rds:operator');
const SqlString = require('./sqlstring');
const literals = require('./literals');
const wrap = require('co-wrap-all');

module.exports = Operator;

/**
 * Operator Interface
 */
function Operator() { }

const proto = Operator.prototype;

proto.literals = literals;

proto.escape = function (value, stringifyObjects, timeZone) {
  return SqlString.escape(value, stringifyObjects, timeZone);
};

proto.escapeId = function (value, forbidQualified) {
  return SqlString.escapeId(value, forbidQualified);
};

proto.format = function (sql, values, stringifyObjects, timeZone) {
  // if values is object, not null, not Array;
  if (!Array.isArray(values) && typeof values === 'object' && values !== null) {
    // object not support replace column like ??;
    return sql.replace(/\:(\w+)/g, function (txt, key) {
      if (values.hasOwnProperty(key)) {
        return SqlString.escape(values[key]);
      }
      // if values don't hasOwnProperty, return origin txt;
      return txt;
    });
  }
  return SqlString.format(sql, values, stringifyObjects, timeZone);

};

proto.query = function* (sql, values) {
  console.log(sql);
  if (arguments.length >= 2) {
    sql = this.format(sql, values);
  }
  debug('query %j', sql);
  try {
    const rows = yield this._query(sql);
    debug('query get %d rows', rows.length);
    return rows;
  } catch (err) {
    err.stack = err.stack + '\n    sql: ' + sql;
    debug('query error: %s', err);
    throw err;
  }
};

proto.queryOne = function* (sql, values) {
  const rows = yield this.query(sql, values);
  return rows && rows[0] || null;
};

proto._query = function (/* sql */) {
  throw new Error('SubClass must impl this');
};

proto.count = function* (table, where) {
  const sql = this.format('SELECT COUNT(*) as count FROM ??', [table]) +
    this._where(where);
  debug('count(%j, %j) \n=> %j', table, where, sql);
  const rows = yield this.query(sql);
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
  const sql = this._selectColumns(table, options.columns) +
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
  const rows = yield this.select(table, options);
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

  const params = [table, options.columns];
  const strs = [];
  for (let i = 0; i < rows.length; i++) {
    const values = [];
    const row = rows[i];
    for (let j = 0; j < options.columns.length; j++) {
      values.push(row[options.columns[j]]);
    }
    strs.push('(?)');
    params.push(values);
  }

  const sql = this.format('INSERT INTO ??(??) VALUES' + strs.join(', '), params);
  debug('insert(%j, %j, %j) \n=> %j', table, rows, options, sql);
  return yield this.query(sql);
};

proto.update = function* (table, row, options) {
  options = options || {};
  if (!options.columns) {
    options.columns = Object.keys(row);
  }
  if (!options.where) {
    if (!('id' in row)) {
      throw new Error('Can not auto detect update condition, please set options.where, or make sure obj.id exists');
    }
    options.where = {
      id: row.id,
    };
  }

  const sets = [];
  const values = [];
  for (let i = 0; i < options.columns.length; i++) {
    const column = options.columns[i];
    sets.push('?? = ?');
    values.push(column);
    values.push(row[column]);
  }
  const sql = this.format('UPDATE ?? SET ', [table]) +
    this.format(sets.join(', '), values) +
    this._where(options.where);
  debug('update(%j, %j, %j) \n=> %j', table, row, options, sql);
  return yield this.query(sql);
};

/**
 *
 * Update multiple rows from a table
 *
 * UPDATE `table_name` SET
 *  `column1` CASE
 *     WHEN  condition1 THEN 'value11'
 *     WHEN  condition2 THEN 'value12'
 *     WHEN  condition3 THEN 'value13'
 *     ELSE `column1` END,
 *  `column2` CASE
 *     WHEN  condition1 THEN 'value21'
 *     WHEN  condition2 THEN 'value22'
 *     WHEN  condition3 THEN 'value23'
 *     ELSE `column2` END
 * WHERE condition
 *
 * See MySQL Case Syntax: https://dev.mysql.com/doc/refman/5.7/en/case.html
 *
 * @param {String} table table name
 * @param {Array<Object>} options Object Arrays
 *    each Object needs a primary key `id`, or each Object has `row` and `where` properties
 *    e.g.
 *      [{ id: 1, name: 'fengmk21' }]
 *      or [{ row: { name: 'fengmk21' }, where: { id: 1 } }]
 * @return {object} update result
 */
proto.updateRows = function* (table, options) {
  if (!Array.isArray(options)) {
    throw new Error('Options should be array');
  }

  /**
   * {
   *  column: {
   *    when: [ 'WHEN condition1 THEN ?', 'WHEN condition12 THEN ?' ],
   *    then: [ value1, value1 ]
   *  }
   * }
   */
  const SQL_CASE = {};
  // e.g. { id: [], column: [] }
  const WHERE = {};

  options.forEach(option => {

    if (!option.hasOwnProperty('id') && !(option.row && option.where)) {
      throw new Error('Can not auto detect updateRows condition, please set option.row and option.where, or make sure option.id exists');
    }

    // convert { id, column } to { row: { column }, where: { id } }
    if (option.hasOwnProperty('id')) {
      const where = { id: option.id };
      const row = Object.keys(option).reduce((result, key) => {
        if (key !== 'id') {
          result[key] = option[key];
        }
        return result;
      }, {});
      option = { row, where };
    }

    let where = this._where(option.where);
    where = where.indexOf('WHERE') === -1 ? where : where.substring(where.indexOf('WHERE') + 5);
    for (const key in option.row) {
      if (!SQL_CASE[key]) {
        SQL_CASE[key] = { when: [], then: [] };
      }
      SQL_CASE[key].when.push(' WHEN ' + where + ' THEN ? ');
      SQL_CASE[key].then.push(option.row[key]);
    }

    for (const key in option.where) {
      if (!WHERE[key]) {
        WHERE[key] = [];
      }
      if (WHERE[key].indexOf(option.where[key]) === -1) {
        WHERE[key].push(option.where[key]);
      }
    }
  });

  let SQL = ['UPDATE ?? SET '];
  let VALUES = [table];

  const TEMPLATE = [];
  for (const key in SQL_CASE) {
    let templateSql = ' ?? = CASE ';
    VALUES.push(key);
    templateSql += SQL_CASE[key].when.join(' ');
    VALUES = VALUES.concat(SQL_CASE[key].then);
    templateSql += ' ELSE ?? END ';
    TEMPLATE.push(templateSql);
    VALUES.push(key);
  }

  SQL += TEMPLATE.join(' , ');
  SQL += this._where(WHERE);

  /**
   * e.g.
   *
   * updateRows(table, [
   *  {id: 1, name: 'fengmk21', email: 'm@fengmk21.com'},
   *  {id: 2, name: 'fengmk22', email: 'm@fengmk22.com'},
   *  {id: 3, name: 'fengmk23', email: 'm@fengmk23.com'},
   * ])
   *
   * UPDATE `ali-sdk-test-user` SET
   *  `name` =
   *    CASE
   *      WHEN  `id` = 1 THEN 'fengmk21'
   *      WHEN  `id` = 2 THEN 'fengmk22'
   *      WHEN  `id` = 3 THEN 'fengmk23'
   *      ELSE `name` END,
   *  `email` =
   *    CASE
   *      WHEN  `id` = 1 THEN 'm@fengmk21.com'
   *      WHEN  `id` = 2 THEN 'm@fengmk22.com'
   *      WHEN  `id` = 3 THEN 'm@fengmk23.com'
   *      ELSE `email` END
   *  WHERE `id` IN (1, 2, 3)
   */
  const sql = this.format(SQL, VALUES);
  debug('updateRows(%j, %j) \n=> %j', table, options, sql);
  return yield this.query(sql);
};

proto.delete = function* (table, where) {
  const sql = this.format('DELETE FROM ??', [table]) +
    this._where(where);
  debug('delete(%j, %j) \n=> %j', table, where, sql);
  return yield this.query(sql);
};
/**
 * 
 * where:{
            sender: { op: 'like', value: `%111%` },
            receiver: { op: 'like', value: `%222%` },
            cn_orderno_list: { op: 'like', value: `%333%` },
            OR: {
                sender11: { op: 'like', value: `%111%` },
                receiver22: { op: 'like', value: `%222%` },
            },
            a: 1,
            b: [11, 22],
            AND: {
                orderno: null,
                id: 1,
                role: ['admin', 'guest'],
                OR: {
                    realname: { op: 'like', value: 'simba' },
                    age: { op: '>', value: '20' },
                    nickname: { op: 'like', value: 'ace' }
                },
                createtime: [
                    { op: '>', value: '2020-10-13' },
                    { op: '<', value: '2020-11-22' },
                ]
            },
        }
 * 
 * 生成SQL:
 *  SELECT *  FROM `t_order` 
    WHERE `sender` like '%111%' 
    AND `receiver` like '%222%' 
    AND `cn_orderno_list` like '%333%' 
    AND (`sender11` like '%111%' OR `receiver22` like '%222%') 
    AND `a` = 1 
    AND `b` IN (11, 22) 
    AND (`orderno` IS NULL AND `id` = 1 
    AND `role` IN ('admin', 'guest') 
    AND (`realname` like 'simba' OR `age` > '20' OR `nickname` like 'ace') 
    AND (`createtime` > '2020-10-13' AND `createtime` < '2020-11-22'))
 * 
 * 
 */


proto._where = function (where) {

  return ' WHERE ' + fakeWhere.call(this, where)
}

function fakeWhere(where, op = ' AND ') {
  if (!where) return '';
  const wheres = [];
  const values = [];
  for (const key in where) {
    let val = where[key];
    switch (key) {
      case 'OR':
      case 'AND':
        wheres.push(`(${fakeWhere.call(this, val, ` ${key} `)})`)
        break;
      default:
        if (Array.isArray(val)) {
          //type:[1,2]
          if (['string', 'number'].includes(typeof val[0])) {
            wheres.push(`?? IN (?)`)
          } else {
            //createtime: [
            // { op: '>', value: '2020-10-13' },
            // { op: '<', value: '2020-11-22' },
            //]
            let rr = []
            val.forEach(r => {
              rr.push(`?? ${r.op} ?`)
              values.push(key);
              values.push(r.value);
            })
            wheres.push(`(${rr.join(' AND ')})`);
          }
        } else {
          // orderid:null
          if (val === null || val === undefined)
            wheres.push(`?? IS ?`)
          // a:{op:'>',value:'2020'}
          else if (val && val.op)
            wheres.push(`?? ${val.op} ?`)
          //a:1
          else
            wheres.push(`?? = ?`)
        }
        values.push(key);
        //有带运算的条件，拼接value
        if (val && val.op) values.push(val.value)
        else values.push(val);
    }
  }

  return wheres.length > 0 ? this.format(wheres.join(op), values) : '';
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
    orders = [orders];
  }
  const values = [];
  for (let i = 0; i < orders.length; i++) {
    const value = orders[i];
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

wrap(proto);
