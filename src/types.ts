import type { PoolConnection } from 'mysql';

export interface PoolConnectionPromisify extends Omit<PoolConnection, 'query'> {
  query(sql: string): Promise<any>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export type SelectOption = {
  where?: object;
  columns?: string | string[];
  orders?: string | any[];
  limit?: number;
  offset?: number;
};

export type InsertOption = {
  columns?: string[];
};

export type InsertResult = {
  fieldCount: number;
  affectedRows: number;
  insertId: number;
  serverStatus: number;
  warningCount: number;
  message: string;
  protocol41: boolean;
  changedRows: number;
};

export type UpdateOption = {
  where?: object;
  columns?: string[];
};

export type UpdateResult = InsertResult;
export type DeleteResult = InsertResult;
export type LockResult = InsertResult;

export type UpdateRow = {
  row?: object;
  where?: object;
  [key: string]: any;
};

export type LockTableOption = {
  tableName: string;
  lockType: string;
  tableAlias: string;
};

export type BeforeQueryHandler = (sql: string) => string | undefined | void;
export type AfterQueryHandler = (sql: string, result: any, execDuration: number, err?: Error) => void;
