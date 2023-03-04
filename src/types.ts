export type SelectOption = {
  where?: object;
  columns?: string | string[];
  orders?: string | string[];
  limit?: number;
  offset?: number;
};

export type InsertOption = {
  columns?: string[];
};

export type InsertResult = {
  affectedRows: number;
  fieldCount: number;
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
