function Literal(text) {
  if (!(this instanceof Literal)) {
    return new Literal(text);
  }
  this.text = text;
}

Literal.prototype.toString = function() {
  return this.text;
};


exports.Literal = Literal;
exports.now = new Literal('now()');
