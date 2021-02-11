import {
  PoolConfig,
  Query,
  Pool as BasePool,
  QueryFunction,
  PoolConnection,
  MysqlError,
} from 'mysql';

type QueryOptions = {
  where?: any;
  columns?: string[] | string;
  orders?: any[] | string;
  limit?: number;
  offset?: number;
};

interface Literal {
  text: string;
  new (text: string): Literal;
  toString: string;
}

type literal = {
  Literal: Literal;
  now: Literal;
};

interface Operator {
  literals: literal;
  escape(value: any, stringifyObjects?: boolean, timeZone?: string): string;
  escapeId(value: string, forbidQualified?: boolean): string;
  format(
    sql: string,
    values: any,
    stringifyObjects: boolean,
    timeZone: string
  ): string;
  query(sql: string, values?: any): Promise<any[]>;
  queryOne(sql: string, values?: any): Promise<any>;
  count(table: string, where?: any): Promise<number>;
  select(table: string, option?: QueryOptions): Promise<any[]>;
  get(table: string, where?: any, option?: QueryOptions): Promise<any>;
  insert(table: string, rows: any, option?: QueryOptions): Promise<any>;
  update(table: string, row: any, option?: QueryOptions): Promise<any>;
  updateRows(table: string, option: any[]): Promise<any>;
  updadeleteteRows(table: string, where: any): Promise<any>;
  delete(table: string, where: any): Promise<any>;
}

interface RDSConnection extends Operator {
  release(): void;
  beginTransaction(): void;
  commit(): void;
  rollback(): void;
}

interface RDSTransaction extends Operator {
  isCommit: boolean;
  isRollback: boolean;
  commit(): Promise<any>;
  rollback(): Promise<any>;
}

interface RDSClient extends Operator {
  getConnection(): Promise<RDSConnection>;
  beginTransaction(): Promise<RDSTransaction>;
  beginTransactionScope<T extends (...args: any) => any>(
    scope: T,
    ctx?: any
  ): ReturnType<T>;
  beginDoomedTransactionScope<T extends (...args: any) => any>(
    scope: T,
    ctx?: any
  ): ReturnType<T>;
  end(callback: any): Promise<any>;
}

declare function rds(config?: PoolConfig): RDSClient;

declare namespace rds {
  export type literals = Literal;
}

export default rds;
