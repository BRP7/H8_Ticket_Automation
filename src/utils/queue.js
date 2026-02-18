import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
const FILE = path.join(DATA_DIR, "queue.json");
const TEMP_FILE = FILE + ".tmp";

let isSaving = false;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/* =========================
   ENSURE FILE EXISTS
========================= */
function ensureFile() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, "[]", "utf8");
  }
}

/* =========================
   SAFE READ (SELF HEALING)
========================= */
function readQueue() {
  try {
    ensureFile();

    const raw = fs.readFileSync(FILE, "utf8");

    if (!raw || !raw.trim()) {
      fs.writeFileSync(FILE, "[]", "utf8");
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      fs.writeFileSync(FILE, "[]", "utf8");
      return [];
    }

    return parsed;

  } catch {
    try {
      fs.writeFileSync(FILE, "[]", "utf8");
    } catch (_) {}
    return [];
  }
}

/* =========================
   SAFE WRITE (ATOMIC)
========================= */
function saveQueue(queue) {
  if (isSaving) return;
  isSaving = true;

  try {
    const data = JSON.stringify(queue, null, 2);

    fs.writeFileSync(TEMP_FILE, data, "utf8");

    if (fs.existsSync(FILE)) {
      fs.unlinkSync(FILE);
    }

    fs.renameSync(TEMP_FILE, FILE);

  } catch {
    try {
      if (fs.existsSync(TEMP_FILE)) {
        fs.unlinkSync(TEMP_FILE);
      }
    } catch (_) {}
  } finally {
    isSaving = false;
  }
}

/* =========================
   ENQUEUE
========================= */
export function enqueue(mail) {
  try {
    const queue = readQueue();

    if (queue.some(q => q.id === mail.id)) return;

    queue.push({
      ...mail,
      attempts: 0,
      enqueuedAt: new Date().toISOString()
    });

    saveQueue(queue);
  } catch {}
}

/* =========================
   DEQUEUE
========================= */
export function dequeue() {
  try {
    const queue = readQueue();
    if (!queue.length) return null;

    const job = queue.shift();
    saveQueue(queue);

    return job;
  } catch {
    return null;
  }
}

/* =========================
   REMOVE BY ID
========================= */
export function removeById(id) {
  try {
    const queue = readQueue();
    const filtered = queue.filter(q => q.id !== id);
    saveQueue(filtered);
  } catch {}
}

/* =========================
   INCREMENT ATTEMPT
========================= */
export function incrementAttempt(id) {
  try {
    const queue = readQueue();
    const item = queue.find(q => q.id === id);

    if (item) {
      item.attempts = (item.attempts || 0) + 1;
      saveQueue(queue);
    }
  } catch {}
}

/* =========================
   PEEK
========================= */
export function peek() {
  try {
    const queue = readQueue();
    return queue.length ? queue[0] : null;
  } catch {
    return null;
  }
}

/* =========================
   LENGTH
========================= */
export function getQueueLength() {
  try {
    return readQueue().length;
  } catch {
    return 0;
  }
}

/* =========================
   CLEAR
========================= */
export function clearQueue() {
  try {
    saveQueue([]);
  } catch {}
}
