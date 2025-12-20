// src/utils/retry.js

export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    delayMs = 5000,
    onRetry = () => {},
  } = options;

  let attempt = 0;

  while (true) {
    try {
      attempt++;
      return await fn();
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }

      onRetry(err, attempt);

      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}
