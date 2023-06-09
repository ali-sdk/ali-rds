import { debuglog } from 'node:util';
import { SqlString } from './sqlstring';
import literals from './literals';
import {
  AfterQueryHandler, BeforeQueryHandler,
  DeleteResult,
  InsertOption, InsertResult,
  LockResult, LockTableOption,
  SelectOption,
  UpdateOption, UpdateResult, UpdateRow,
  PoolConnectionPromisify,
} from './types';
import channels from './channels';
import type { QueryStartMessage, QueryEndMessage } from './channels';

const debug = debuglog('ali-rds:operator');

/**
 * Operator Interface
 */
export abstract class Operator {
  #connection: PoolConnectionPromisify;
  constructor(connection?: PoolConnectionPromisify) {
    if (connection) {
      this.#connection = connection;
    }
  }

  protected beforeQueryHandlers: BeforeQueryHandler[] = [];
  protected afterQueryHandlers: AfterQueryHandler[] = [];

  get literals() { return literals; }

  get threadId() {
    return this.#connection?.threadId;
  }

  beforeQuery(beforeQueryHandler: BeforeQueryHandler) {
    this.beforeQueryHandlers.push(beforeQueryHandler);
  }

  afterQuery(afterQueryHandler: AfterQueryHandler) {
    this.afterQueryHandlers.push(afterQueryHandler);
  }

  escape(value: any, stringifyObjects?: boolean, timeZone?: string): string {
    return SqlString.escape(value, stringifyObjects, timeZone);
  }

  escapeId(value: any, forbidQualified?: boolean): string {
    return SqlString.escapeId(value, forbidQualified);
  }

  format(sql: string, values: any, stringifyObjects?: boolean, timeZone?: string): string {
    // if values is object, not null, not Array;
    if (!Array.isArray(values) && typeof values === 'object' && values !== null) {
      // object not support replace column like ??;
      return sql.replace(/\:(\w+)/g, (text, key) => {
        if (values.hasOwnProperty(key)) {
          return SqlString.escape(values[key]);
        }
        // if values don't hasOwnProperty, return origin text;
        return text;
      });
    }
    return SqlString.format(sql, values, stringifyObjects, timeZone);
  }

  async query<T = any>(sql: string, values?: object | any[]): Promise<T> {
    // query(sql, values)
    if (values) {
      sql = this.format(sql, values);
    }
    if (this.beforeQueryHandlers.length > 0) {
      for (const beforeQueryHandler of this.beforeQueryHandlers) {
        const newSql = beforeQueryHandler(sql);
        if (newSql) {
          sql = newSql;
        }
      }
    }
    debug('query %o', sql);
    const queryStart = Date.now();
    let rows: any;
    let lastError: Error | undefined;
    channels.queryStart.publish({
      sql,
      connection: this.#connection,
    } as QueryStartMessage);
    try {
      rows = await this._query(sql);
      if (Array.isArray(rows)) {
        debug('query get %o rows', rows.length);
      } else {
        debug('query result: %o', rows);
      }
      return rows;
    } catch (err) {
      lastError = err;
      err.stack = `${err.stack}\n    sql: ${sql}`;
      debug('query error: %o', err);
      throw err;
    } finally {
      channels.queryEnd.publish({
        sql,
        connection: this.#connection,
        error: lastError,
      } as QueryEndMessage);
      if (this.afterQueryHandlers.length > 0) {
        const execDuration = Date.now() - queryStart;
        for (const afterQueryHandler of this.afterQueryHandlers) {
          afterQueryHandler(sql, rows, execDuration, lastError);
        }
      }
    }
  }

  async queryOne(sql: string, values?: object | any[]) {
    const rows = await this.query(sql, values);
    return rows && rows[0] || null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _query(_sql: string): Promise<any> {
    throw new Error('SubClass must impl this');
  }

  async count(table: string, where?: object) {
    const sql = this.format('SELECT COUNT(*) as count FROM ??', [ table ]) +
      this._where(where);
    debug('count(%j, %j) \n=> %j', table, where, sql);
    const rows = await this.query(sql);
    return rows[0].count;
  }

  /**
   * Select rows from a table
   *
   * @param  {String} table     table name
   * @param  {Object} [option] optional params
   *  - {Object} where          query condition object
   *  - {Array|String} columns  select columns, default is `'*'`
   *  - {Array|String} orders   result rows sort condition
   *  - {Number} limit          result limit count, default is no limit
   *  - {Number} offset         result offset, default is `0`
   * @return {Array} result rows
   */
  async select(table: string, option?: SelectOption): Promise<any[]> {
    option = option || {};
    const sql = this._selectColumns(table, option.columns) +
      this._where(option.where) +
      this._orders(option.orders) +
      this._limit(option.limit, option.offset);
    debug('select(%o, %o) \n=> %o', table, option, sql);
    return await this.query(sql);
  }

  async get(table: string, where?: object, option?: SelectOption) {
    option = option || {};
    option.where = where;
    option.limit = 1;
    option.offset = 0;
    const rows = await this.select(table, option);
    return rows && rows[0] || null;
  }

  async insert(table: string, rows: object | object[], option?: InsertOption): Promise<InsertResult> {
    option = option || {};
    let insertRows: object[];
    let firstObj: object;
    // insert(table, rows)
    if (Array.isArray(rows)) {
      firstObj = rows[0];
      insertRows = rows;
    } else {
      // insert(table, row)
      firstObj = rows;
      insertRows = [ rows ];
    }
    if (!option.columns) {
      option.columns = Object.keys(firstObj);
    }

    const params = [ table, option.columns ];
    const strs: string[] = [];
    for (const row of insertRows) {
      const values: any[] = [];
      for (const column of option.columns) {
        values.push(row[column]);
      }
      strs.push('(?)');
      params.push(values);
    }

    const sql = this.format('INSERT INTO ??(??) VALUES' + strs.join(', '), params);
    debug('insert(%o, %o, %o) \n=> %o', table, rows, option, sql);
    return await this.query(sql);
  }

  async update(table: string, row: object, option?: UpdateOption): Promise<UpdateResult> {
    option = option || {};
    if (!option.columns) {
      option.columns = Object.keys(row);
    }
    if (!option.where) {
      if (!('id' in row)) {
        throw new Error('Can not auto detect update condition, please set option.where, or make sure obj.id exists');
      }
      option.where = {
        id: row.id,
      };
    }

    const sets: string[] = [];
    const values: any[] = [];
    for (const column of option.columns) {
      sets.push('?? = ?');
      values.push(column);
      values.push(row[column]);
    }
    const sql = this.format('UPDATE ?? SET ', [ table ]) +
      this.format(sets.join(', '), values) +
      this._where(option.where);
    debug('update(%o, %o, %o) \n=> %o', table, row, option, sql);
    return await this.query(sql);
  }

  /**
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
   * @param {Array<Object>} updateRows Object Arrays
   *    each Object needs a primary key `id`, or each Object has `row` and `where` properties
   *    e.g.
   *      [{ id: 1, name: 'fengmk21' }]
   *      or [{ row: { name: 'fengmk21' }, where: { id: 1 } }]
   * @return {object} update result
   */
  async updateRows(table: string, updateRows: UpdateRow[]): Promise<UpdateResult> {
    if (!Array.isArray(updateRows)) {
      throw new Error('updateRows should be array');
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

    for (const updateRow of updateRows) {
      const row = updateRow.row ?? updateRow;
      let where = updateRow.where;
      const hasId = 'id' in row;
      if (!hasId && !where) {
        throw new Error('Can not auto detect updateRows condition, please set updateRow.where, or make sure updateRow.id exists');
      }

      // convert { id, column } to { row: { column }, where: { id } }
      if (hasId) {
        where = { id: updateRow.id };
      }

      let whereString = this._where(where);
      whereString = !whereString.includes('WHERE') ? whereString : whereString.substring(whereString.indexOf('WHERE') + 5);
      for (const key in row) {
        if (key === 'id') continue;
        if (!SQL_CASE[key]) {
          SQL_CASE[key] = { when: [], then: [] };
        }
        SQL_CASE[key].when.push(' WHEN ' + whereString + ' THEN ? ');
        SQL_CASE[key].then.push(row[key]);
      }

      for (const key in where) {
        if (!WHERE[key]) {
          WHERE[key] = [];
        }
        if (!WHERE[key].includes(where[key])) {
          WHERE[key].push(where[key]);
        }
      }
    }

    let SQL = 'UPDATE ?? SET ';
    let VALUES = [ table ];

    const TEMPLATE: string[] = [];
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
    debug('updateRows(%o, %o) \n=> %o', table, updateRows, sql);
    return await this.query(sql);
  }

  async delete(table: string, where?: object | null): Promise<DeleteResult> {
    const sql = this.format('DELETE FROM ??', [ table ]) +
      this._where(where);
    debug('delete(%j, %j) \n=> %j', table, where, sql);
    return await this.query(sql);
  }

  protected _where(where?: object | null) {
    if (!where) {
      return '';
    }

    const wheres: string[] = [];
    const values: any[] = [];
    for (const key in where) {
      const value = where[key];
      if (Array.isArray(value)) {
        wheres.push('?? IN (?)');
      } else {
        if (value === null || value === undefined) {
          wheres.push('?? IS ?');
        } else {
          wheres.push('?? = ?');
        }
      }
      values.push(key);
      values.push(value);
    }
    if (wheres.length > 0) {
      return this.format(' WHERE ' + wheres.join(' AND '), values);
    }
    return '';
  }

  protected _selectColumns(table: string, columns?: string | string[]) {
    if (!columns || columns.length === 0) {
      columns = '*';
    }
    if (columns === '*') {
      return this.format('SELECT * FROM ??', [ table ]);
    }
    return this.format('SELECT ?? FROM ??', [ columns, table ]);
  }

  protected _orders(orders?: string | string[]) {
    if (!orders) {
      return '';
    }
    if (typeof orders === 'string') {
      orders = [ orders ];
    }
    const values: string[] = [];
    for (const value of orders) {
      if (typeof value === 'string') {
        values.push(this.escapeId(value));
      } else if (Array.isArray(value)) {
        // value format: ['name', 'desc'], ['name'], ['name', 'asc']
        let sort = String(value[1]).toUpperCase();
        if (sort !== 'ASC' && sort !== 'DESC') {
          sort = '';
        }
        if (sort) {
          values.push(this.escapeId(value[0]) + ' ' + sort);
        } else {
          values.push(this.escapeId(value[0]));
        }
      }
    }
    return ' ORDER BY ' + values.join(', ');
  }

  protected _limit(limit?: number, offset?: number) {
    if (!limit || typeof limit !== 'number') {
      return '';
    }
    if (typeof offset !== 'number') {
      offset = 0;
    }
    return ' LIMIT ' + offset + ', ' + limit;
  }

  /**
   * Lock tables.
   * @param {object[]} lockTableOptions table lock descriptions.
   * @description
   * LOCK TABLES
   *   tbl_name [[AS] alias] lock_type
   *   [, tbl_name [[AS] alias] lock_type] ...
   * lock_type: {
   *   READ [LOCAL]
   *   | [LOW_PRIORITY] WRITE
   * }
   * For more details:
   * https://dev.mysql.com/doc/refman/8.0/en/lock-tables.html
   * @example
   * await locks([{ tableName: 'posts', lockType: 'READ', tableAlias: 't' }]);
   */
  async locks(lockTableOptions: LockTableOption[]) {
    const sql = this.#locks(lockTableOptions);
    debug('lock tables \n=> %o', sql);
    return await this.query(sql);
  }

  /**
   * Lock a single table.
   * @param {string} tableName table name
   * @param {string} lockType lock type
   * @param {string} tableAlias table alias
   * @description
   * LOCK TABLES
   *   tbl_name [[AS] alias] lock_type
   *   [, tbl_name [[AS] alias] lock_type] ...
   * lock_type: {
   *   READ [LOCAL]
   *   | [LOW_PRIORITY] WRITE
   * }
   * For more details:
   * https://dev.mysql.com/doc/refman/8.0/en/lock-tables.html
   * @example
   * await lockOne('posts_table', 'READ', 't'); // LOCK TABLS 'posts_table' AS t READ
   */
  async lockOne(tableName: string, lockType: string, tableAlias: string): Promise<LockResult> {
    const sql = this.#locks([{ tableName, lockType, tableAlias }]);
    debug('lock one table \n=> %o', sql);
    return await this.query(sql);
  }

  #locks(lockTableOptions: LockTableOption[]) {
    if (lockTableOptions.length === 0) {
      throw new Error('Cannot lock empty tables.');
    }
    let sql = 'LOCK TABLES ';
    for (const [ index, lockTableOption ] of lockTableOptions.entries()) {
      const { tableName, lockType, tableAlias } = lockTableOption;
      if (!tableName) {
        throw new Error('No table_name provided while trying to lock table');
      }
      if (!lockType) {
        throw new Error('No lock_type provided while trying to lock table `' + tableName + '`');
      }
      if (![ 'READ', 'WRITE', 'READ LOCAL', 'LOW_PRIORITY WRITE' ].includes(lockType.toUpperCase())) {
        throw new Error('lock_type provided while trying to lock table `' + tableName +
        '` must be one of the following(CASE INSENSITIVE):\n`READ` | `WRITE` | `READ LOCAL` | `LOW_PRIORITY WRITE`');
      }
      if (index > 0) {
        sql += ', ';
      }
      sql += ' ' + this.escapeId(tableName) + ' ';
      if (tableAlias) {
        sql += ' AS ' + this.escapeId(tableAlias) + ' ';
      }
      sql += ' ' + lockType;
    }
    return sql + ';';
  }

  /**
   * To unlock all tables locked in current session.
   * For more details:
   * https://dev.mysql.com/doc/refman/8.0/en/lock-tables.html
   * @example
   * await unlock(); // unlock all tables.
   */
  async unlock() {
    debug('unlock tables');
    return await this.query('UNLOCK TABLES;');
  }
}
