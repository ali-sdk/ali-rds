export class Literal {
  #text: string;
  constructor(text: string) {
    this.#text = text;
  }

  toString() {
    return this.#text;
  }
}

export default {
  now: new Literal('now()'),
  Literal,
};
