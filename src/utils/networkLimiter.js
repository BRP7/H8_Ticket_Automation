import pLimit from "p-limit";

const NETWORK_CONCURRENCY = parseInt(
  process.env.NETWORK_CONCURRENCY || "5"
);

export const networkLimit = pLimit(NETWORK_CONCURRENCY);
