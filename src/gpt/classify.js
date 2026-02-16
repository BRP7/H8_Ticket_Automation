import OpenAI from "openai";
import { SUB_SUB_CATEGORY } from "./schema.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { networkLimit } from "../utils/networkLimiter.js";

/* =====================================================
   OPENAI CLIENT
===================================================== */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =====================================================
   FLATTEN ALLOWED SUB-SUB LIST
===================================================== */

const ALL_SUB_SUB = Object.values(SUB_SUB_CATEGORY)
  .flatMap(sub => Object.values(sub))
  .flat();

/* =====================================================
   UTILITIES
===================================================== */

function trimBody(body, maxChars = 10000) {
  if (!body || typeof body !== "string") return "";
  return body.length > maxChars ? body.slice(0, maxChars) : body;
}

function resolveHierarchy(subSub) {
  for (const caseReason in SUB_SUB_CATEGORY) {
    for (const subCat in SUB_SUB_CATEGORY[caseReason]) {
      if (SUB_SUB_CATEGORY[caseReason][subCat].includes(subSub)) {
        return {
          caseReasonCategory: caseReason,
          subCategory: subCat
        };
      }
    }
  }
  return null;
}

function getPriority(caseReason) {
  if (caseReason === "Service Affecting") return "High";
  if (caseReason === "Non Service Affecting") return "Medium";
  return "Low";
}

function hardSystemIgnore(subject = "", from = "") {
  const s = (subject || "").toLowerCase();
  const f = (from || "").toLowerCase();

  return (
    s.includes("undeliverable") ||
    s.includes("message recall report") ||
    s.includes("delivery has failed") ||
    f.includes("postmaster") ||
    f.includes("mailer-daemon")
  );
}

/* =====================================================
   STRICT CIRCUIT VALIDATION
===================================================== */

const CIRCUIT_REGEX =
  /\b(OPTL[\s-]?\d{3,}|OTPL[\s-]?\d{3,}|LS[\s-]?\d{2,}|L[\s-]?\d{4,})\b/i;

export function extractCircuitId(text) {
  if (!text) return null;

  const match = text.match(CIRCUIT_REGEX);
  if (!match) return null;

  return match[0].replace(/\s|-/g, "").toUpperCase();
}

/* =====================================================
   MAIN CLASSIFIER
===================================================== */

export async function classifyEmailWithGPT({ subject, from, body }) {
  if (hardSystemIgnore(subject, from)) {
    return buildEmptyResult(100);
  }

  const input = `
Subject:
${subject || ""}

From:
${from || ""}

Body (Latest Message Only):
${trimBody(body)}
`;

  const response = await networkLimit(() =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: input }
      ]
    })
  );

  let parsed;

  try {
    parsed = JSON.parse(response.choices[0].message.content);
  } catch {
    throw new Error("Invalid GPT JSON response");
  }

  parsed.isIssue = typeof parsed.isIssue === "boolean" ? parsed.isIssue : false;
  parsed.confidence =
    typeof parsed.confidence === "number" ? parsed.confidence : 0;

  parsed.subSubCategory =
    ALL_SUB_SUB.find(
      s =>
        s.toLowerCase().trim() ===
        parsed.subSubCategory?.toLowerCase().trim()
    ) || null;

  if (!parsed.isIssue || !parsed.subSubCategory) {
    return buildEmptyResult(parsed.confidence);
  }

  const circuitId = extractCircuitId(`${subject} ${body}`);

  if (!circuitId) {
    return buildEmptyResult(parsed.confidence);
  }

  parsed.circuitId = circuitId;

  const hierarchy = resolveHierarchy(parsed.subSubCategory);
  if (!hierarchy) {
    return buildEmptyResult(parsed.confidence);
  }

  parsed.caseReasonCategory = hierarchy.caseReasonCategory;
  parsed.subCategory = hierarchy.subCategory;
  parsed.priority = getPriority(hierarchy.caseReasonCategory);

  return parsed;
}

/* =====================================================
   SAFE EMPTY RESULT BUILDER
===================================================== */

function buildEmptyResult(confidence = 0) {
  return {
    isIssue: false,
    circuitId: null,
    caseReasonCategory: null,
    subCategory: null,
    subSubCategory: null,
    priority: "Medium",
    summary: null,
    confidence,
    manualReview: false
  };
}
