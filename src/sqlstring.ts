import SqlString from 'mysql/lib/protocol/SqlString';
import { Literal } from './literals';

const SQLSTRING_ESCAPE = Symbol('SQLSTRING_ESCAPE');

if (!SqlString[SQLSTRING_ESCAPE]) {
  SqlString[SQLSTRING_ESCAPE] = SqlString.escape;

  SqlString.escape = (val: any, stringifyObjects?: boolean, timeZone?: string) => {
    if (val instanceof Literal) {
      return val.toString();
    }
    return SqlString[SQLSTRING_ESCAPE](val, stringifyObjects, timeZone);
  };
}

export { SqlString };
