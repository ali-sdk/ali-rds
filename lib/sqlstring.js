/**!
 * ali-rds - lib/sqlstring.js
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

var SqlString = require('mysql/lib/protocol/SqlString');
var Literal = require('./literals').Literal;

module.exports = SqlString;

SqlString.__escape = SqlString.escape;

SqlString.escape = function(val, stringifyObjects, timeZone) {
  if (val instanceof Literal) {
    return val.toString();
  }
  return SqlString.__escape(val, stringifyObjects, timeZone);
};
