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

Literal.prototype.toString = function() {
  return this.text;
};

exports.now = new Literal('now()');
