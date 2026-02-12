import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
const FILE = path.join(DATA_DIR, "queue.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* =========================
   SAFE READ
========================= */
function readQueue() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const raw = fs.readFileSync(FILE, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("⚠ Queue file corrupted. Resetting...");
    return [];
  }
}

/* =========================
   SAFE WRITE (ATOMIC)
========================= */
function saveQueue(queue) {
  const tempFile = FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(queue, null, 2));
  fs.renameSync(tempFile, FILE);
}

/* =========================
   ENQUEUE
========================= */
export function enqueue(mail) {
  const queue = readQueue();

  const exists = queue.find(q => q.id === mail.id);
  if (exists) return;

  queue.push({
    ...mail,
    attempts: 0,
    enqueuedAt: new Date().toISOString()
  });

  saveQueue(queue);
}

/* =========================
   DEQUEUE
========================= */
export function dequeue() {
  const queue = readQueue();
  if (!queue.length) return null;

  const job = queue.shift();
  saveQueue(queue);
  return job;
}

/* =========================
   REMOVE SPECIFIC
========================= */
export function removeById(id) {
  const queue = readQueue();
  const filtered = queue.filter(q => q.id !== id);
  saveQueue(filtered);
}

/* =========================
   INCREMENT ATTEMPT
========================= */
export function incrementAttempt(id) {
  const queue = readQueue();
  const item = queue.find(q => q.id === id);
  if (item) {
    item.attempts = (item.attempts || 0) + 1;
    saveQueue(queue);
  }
}

/* =========================
   PEEK (without removing)
========================= */
export function peek() {
  const queue = readQueue();
  return queue.length ? queue[0] : null;
}

/* =========================
   GET LENGTH
========================= */
export function getQueueLength() {
  return readQueue().length;
}

/* =========================
   CLEAR QUEUE (FOR TEST)
========================= */
export function clearQueue() {
  saveQueue([]);
}
