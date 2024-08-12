export class PoolWaitTimeoutError extends Error {
  constructor(...args) {
    super(...args);
    this.name = 'PoolWaitTimeoutError';
  }
}
