// // src/utils/retry.js

// export async function withRetry(fn, options = {}) {
//   const {
//     retries = 3,
//     delayMs = 5000,
//     onRetry = () => {},
//   } = options;

//   let attempt = 0;

//   while (true) {
//     try {
//       attempt++;
//       return await fn();
//     } catch (err) {
//       if (attempt >= retries) {
//         throw err;
//       }

//       onRetry(err, attempt);

//       await new Promise(res => setTimeout(res, delayMs));
//     }
//   }
// }



import { isRetryableError } from "./errorClassifier.js";

export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 3000,
    maxDelayMs = 20000,
    onRetry = () => {},
  } = options;

  let attempt = 0;

  while (attempt < retries) {
    try {
      attempt++;
      return await fn();
    } catch (err) {

      const retryable = isRetryableError(err);

      if (!retryable || attempt >= retries) {
        throw err;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs
      );

      console.log(`🔁 Retry ${attempt} in ${delay}ms`);
      onRetry(err, attempt);

      await new Promise(res => setTimeout(res, delay));
    }
  }
}
