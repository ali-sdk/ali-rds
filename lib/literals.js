/**!
 * ali-rds - lib/literals.js
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

exports.Literal = Literal;

function Literal(text) {
  if (!(this instanceof Literal)) {
    return new Literal(text);
  }
  this.text = text;
}

Literal.prototype.toString = function () {
  return this.text;
};

exports.now = new Literal('now()');
