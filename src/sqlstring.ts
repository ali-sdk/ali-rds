import SqlString from 'mysql/lib/protocol/SqlString';
import { Literal } from './literals';

const kEscape = Symbol('kEscape');

if (!SqlString[kEscape]) {
  SqlString[kEscape] = SqlString.escape;

  SqlString.escape = (val: any, stringifyObjects?: boolean, timeZone?: string) => {
    if (val instanceof Literal) {
      return val.toString();
    }
    return SqlString[kEscape](val, stringifyObjects, timeZone);
  };
}

export { SqlString };
