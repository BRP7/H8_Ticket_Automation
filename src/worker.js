import {
  dequeue,
  removeById,
  incrementAttempt
} from "./utils/queue.js";

import { classifyEmailWithGPT } from "./gpt/classify.js";
import { createH8Ticket } from "./h8.js";
import { getTestCircuitId } from "./utils/testCircuitManager.js";

import { extractCircuitId } from "./gpt/classify.js"; // export it

import {
  tagMessage,
  replyToMessage,
  createDraftReply
} from "./outlook.js";

import { logHistory } from "./utils/historyLogger.js";
import { withRetry } from "./utils/retry.js";
import { writeLog } from "./utils/logger.js";

import {
  ticketFailureTemplate
} from "./utils/emailTemplates.js";

import { ackSuccessTemplate } from "./utils/clientAckTemplates.js";

/* =====================================================
   ENV CONFIG
===================================================== */

const MAX_WORKERS = parseInt(process.env.MAX_CONCURRENT_WORKERS || "3");
const MIN_WORKERS = 1;

const APP_MODE = process.env.APP_MODE || "TEST"; // TEST | PROD
const AUTO_SEND = process.env.AUTO_SEND_REPLY === "true";
const WORKER_ENABLED = process.env.WORKER_ENABLED !== "false";

/* =====================================================
   TAGS
===================================================== */

const TAGS = {
  PROCESSED: "H8-PROCESSED",
  OTHER: "H8-OTHER",
  FAILED: "H8-FAILED",
  DUPLICATE: "H8-DUPLICATE"
};

/* =====================================================
   WORKER STATE
===================================================== */

let active = 0;
let running = false;

let dynamicConcurrency = MAX_WORKERS;
let networkFailures = 0;
let consecutiveFailures = 0;

const MAX_FAILURES = 5;

/* =====================================================
   START WORKER
===================================================== */

export function startWorker() {
  if (!WORKER_ENABLED) {
    writeLog({
      level: "warn",
      type: "WORKER_DISABLED",
      message: "Worker disabled via env flag."
    });
    return;
  }

  if (running) return;
  running = true;

  writeLog({
    level: "info",
    type: "WORKER_STARTED",
    concurrency: MAX_WORKERS,
    mode: APP_MODE,
    autoSend: AUTO_SEND
  });

  setInterval(processQueue, 3000);
}

/* =====================================================
   QUEUE PROCESSOR
===================================================== */

async function processQueue() {
  if (active >= dynamicConcurrency) return;

  const job = dequeue();
  if (!job) return;

  active++;

  handleJob(job)
    .catch(err => {
      writeLog({
        level: "error",
        type: "UNHANDLED_WORKER_ERROR",
        error: err.message
      });
    })
    .finally(() => {
      active--;
    });
}

/* =====================================================
   MAIN JOB HANDLER
===================================================== */

async function handleJob(job) {
  const clientEmail = job.from?.emailAddress?.address || "unknown";

  let result; // defined here so catch can safely reference

  try {
    const safeSubject = job.subject || "";
    const safeBody = job.bodyText || "";

    /* ================= STRICT CIRCUIT PRE-FILTER ================= */

    const circuitId = extractCircuitId(`${safeSubject} ${safeBody}`);

    if (!circuitId) {
      await tagMessage(job.id, TAGS.OTHER);

      writeLog({
        level: "info",
        type: "IGNORED_NO_CIRCUIT",
        subject: job.subject
      });

      removeById(job.id);
      return;
    }

    /* ================= GPT CLASSIFICATION ================= */

    result = await classifyEmailWithGPT({
      subject: safeSubject,
      body: safeBody,
      from: clientEmail
    });

    writeLog({
      level: "debug",
      type: "GPT_RESULT",
      messageId: job.id,
      result
    });

    /* ================= NOT ISSUE ================= */

    if (!result.isIssue || !result.subSubCategory) {
      await tagMessage(job.id, TAGS.OTHER);
      await logHistory(job, result, "NOT_ISSUE");
      removeById(job.id);
      return;
    }

    /* ================= CREATE TICKET ================= */

    let ticketId;

    if (APP_MODE === "TEST") {
      const originalCircuit = result.circuitId;
      const testCircuit = getTestCircuitId();
      result.circuitId = testCircuit;

      writeLog({
        level: "info",
        type: "TEST_MODE_CIRCUIT_OVERRIDE",
        originalCircuit,
        testCircuit
      });

      ticketId = await withRetry(
        () =>
          createH8Ticket({
            ...result,
            originalEmailBody: job.bodyText,
            subject: job.subject,
            from: clientEmail
          }),
        {
          retries: 2,
          delayMs: 4000,
          onRetry: (err, attempt) => {
            writeLog({
              level: "warn",
              type: "TEST_TICKET_RETRY",
              attempt,
              error: err.message
            });
            incrementAttempt(job.id);
          }
        }
      );
    } else {
      ticketId = await withRetry(
        () =>
          createH8Ticket({
            ...result,
            originalEmailBody: job.bodyText,
            subject: job.subject,
            from: clientEmail
          }),
        {
          retries: 3,
          delayMs: 5000,
          onRetry: (err, attempt) => {
            writeLog({
              level: "warn",
              type: "TICKET_RETRY",
              attempt,
              error: err.message
            });
            incrementAttempt(job.id);
          }
        }
      );
    }

    /* ================= SUCCESS ================= */

    writeLog({
      level: "info",
      type: "TICKET_CREATED",
      ticketId,
      circuitId: result.circuitId,
      subSubCategory: result.subSubCategory,
      confidence: result.confidence
    });

    await tagMessage(job.id, TAGS.PROCESSED);

    const ack = ackSuccessTemplate({
      ticketId,
      circuitId: result.circuitId,
      bookedAt: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata"
      })
    });

    if (AUTO_SEND) {
      await replyToMessage(job.id, ack.html);
      writeLog({ level: "info", type: "AUTO_REPLY_SENT", ticketId });
    } else {
      await createDraftReply(job.id, ack.html);
      writeLog({ level: "info", type: "DRAFT_CREATED", ticketId });
    }

    /* ================= AUTO SCALE UP ================= */

    networkFailures = 0;
    consecutiveFailures = 0;

    if (dynamicConcurrency < MAX_WORKERS) {
      dynamicConcurrency++;
    }

    await logHistory(job, result, "TICKET_CREATED");
    removeById(job.id);

  } catch (err) {

    if (err.code === "DUPLICATE_CASE") {
      await tagMessage(job.id, TAGS.DUPLICATE);
      removeById(job.id);
      return;
    }

    writeLog({
      level: "error",
      type: "JOB_FAILED",
      error: err.message,
      subject: job.subject
    });

    await tagMessage(job.id, TAGS.FAILED);

    if (process.env.FAILURE_NOTIFY) {
      const failureTemplate = ticketFailureTemplate({
        circuitId: result?.circuitId || "UNKNOWN",
        error: err.message,
        subject: job.subject
      });

      await sendNewMail({
        to: process.env.FAILURE_NOTIFY,
        subject: `H8 Ticket Failure - ${job.subject}`,
        html: failureTemplate.html
      });
    }

    /* ================= AUTO SCALE DOWN ================= */

    if (
      err.message.includes("fetch failed") ||
      err.message.includes("Connection error") ||
      err.code === "TypeError"
    ) {
      networkFailures++;

      if (networkFailures >= 3 && dynamicConcurrency > MIN_WORKERS) {
        dynamicConcurrency--;
        networkFailures = 0;

        writeLog({
          level: "warn",
          type: "SCALE_DOWN",
          newConcurrency: dynamicConcurrency
        });
      }
    }

    consecutiveFailures++;

    if (consecutiveFailures >= MAX_FAILURES) {
      writeLog({
        level: "fatal",
        type: "CIRCUIT_BREAKER_TRIGGERED"
      });
      process.exit(1);
    }

    removeById(job.id);
  }
}

export function getActiveWorkerCount() {
  return active;
}