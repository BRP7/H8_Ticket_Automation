// import OpenAI from "openai";
// import { SUB_SUB_CATEGORY } from "./schema.js";
// import { SYSTEM_PROMPT } from "./prompt.js";
// import { networkLimit } from "../utils/networkLimiter.js";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// const ALL_SUB_SUB = Object.values(SUB_SUB_CATEGORY)
//   .flatMap(sub => Object.values(sub))
//   .flat();

// function trimBody(body, maxChars = 10000) {
//   if (!body) return "";
//   return body.length > maxChars ? body.slice(0, maxChars) : body;
// }

// function resolveHierarchy(subSub) {
//   for (const caseReason in SUB_SUB_CATEGORY) {
//     for (const subCat in SUB_SUB_CATEGORY[caseReason]) {
//       if (SUB_SUB_CATEGORY[caseReason][subCat].includes(subSub)) {
//         return {
//           caseReasonCategory: caseReason,
//           subCategory: subCat
//         };
//       }
//     }
//   }
//   return null;
// }

// function getPriority(caseReason) {
//   if (caseReason === "Service Affecting") return "High";
//   if (caseReason === "Non Service Affecting") return "Medium";
//   return "Low";
// }


// function hardSystemIgnore(subject = "", from = "") {
//   const s = subject.toLowerCase();
//   const f = from.toLowerCase();

//   return (
//     s.includes("undeliverable") ||
//     s.includes("message recall report") ||
//     s.includes("delivery has failed") ||
//     f.includes("postmaster") ||
//     f.includes("mailer-daemon")
//   );
// }

// export async function classifyEmailWithGPT({ subject, from, body }) {

//   if (hardSystemIgnore(subject, from)) {
//     return {
//       isIssue: false,
//       circuitId: null,
//       caseReasonCategory: null,
//       subCategory: null,
//       subSubCategory: null,
//       priority: "Medium",
//       summary: null,
//       confidence: 100,
//       manualReview: false
//     };
//   }

//   const input = `
// Subject:
// ${subject}

// From:
// ${from}

// Body (Latest Message Only):
// ${trimBody(body)}
// `;

//  const res = await networkLimit(() =>
//   openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     temperature: 0,
//     response_format: { type: "json_object" },
//     messages: [
//       { role: "system", content: SYSTEM_PROMPT },
//       { role: "user", content: input }
//     ]
//   })
// );


//   let parsed;

//   try {
//     parsed = JSON.parse(res.choices[0].message.content);
//   } catch {
//     throw new Error("Invalid GPT JSON");
//   }

//   // --- Basic structure validation ---

//   if (typeof parsed.isIssue !== "boolean") parsed.isIssue = false;
//   if (typeof parsed.confidence !== "number") parsed.confidence = 0;

//   // --- Normalize subSub ---

//  parsed.subSubCategory =
//   ALL_SUB_SUB.find(
//     s =>
//       s.toLowerCase().trim() ===
//       parsed.subSubCategory?.toLowerCase().trim()
//   ) || null;

//   // If subSub invalid → not issue
//   if (parsed.subSubCategory === null) {
//     parsed.isIssue = false;
//   }

//   // --- Circuit validation ---

//  const CIRCUIT_REGEX = /\b(OPTL\d+|OTPL\d+|LS\d+|L\d{4,})\b/i;

//  function extractCircuitId(text) {
//   const match = text.match(CIRCUIT_REGEX);
//   return match ? match[0] : null;
// }

// const circuitId = extractCircuitId(subject + " " + body);
// parsed.circuitId = circuitId;


//   // --- Resolve hierarchy ---

//   if (parsed.isIssue && parsed.subSubCategory) {
//     const hierarchy = resolveHierarchy(parsed.subSubCategory);

//     if (!hierarchy) {
//       parsed.isIssue = false;
//     } else {
//       parsed.caseReasonCategory = hierarchy.caseReasonCategory;
//       parsed.subCategory = hierarchy.subCategory;
//       parsed.priority = getPriority(hierarchy.caseReasonCategory);
//     }
//   } else {
//     parsed.caseReasonCategory = null;
//     parsed.subCategory = null;
//     parsed.priority = "Medium";
//   }

//  if (parsed.isIssue) {
//   if (!parsed.circuitId) {
//     parsed.isIssue = false;
//     parsed.subSubCategory = null;
//     parsed.caseReasonCategory = null;
//     parsed.subCategory = null;
//     parsed.priority = "Medium";
//   }
// }

//   return parsed;
// }


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

const CIRCUIT_REGEX = /\b(OPTL\d{6,}|OTPL\d{6,}|LS\d{3,}|L\d{4,})\b/i;

function extractCircuitId(text) {
  if (!text) return null;
  const match = text.match(CIRCUIT_REGEX);
  return match ? match[0] : null;
}

/* =====================================================
   MAIN CLASSIFIER
===================================================== */

export async function classifyEmailWithGPT({ subject, from, body }) {

  /* =========================
     HARD SYSTEM IGNORE
  ========================= */

  if (hardSystemIgnore(subject, from)) {
    return buildEmptyResult(100);
  }

  /* =========================
     PREPARE INPUT
  ========================= */

  const input = `
Subject:
${subject || ""}

From:
${from || ""}

Body (Latest Message Only):
${trimBody(body)}
`;

  /* =========================
     GPT CALL
  ========================= */

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

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid GPT structure");
  }

  /* =========================
     STRUCTURE NORMALIZATION
  ========================= */

  parsed.isIssue = typeof parsed.isIssue === "boolean" ? parsed.isIssue : false;
  parsed.confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;

  /* =========================
     STRICT SUB-SUB MATCH
  ========================= */

  parsed.subSubCategory =
    ALL_SUB_SUB.find(
      s =>
        s.toLowerCase().trim() ===
        parsed.subSubCategory?.toLowerCase().trim()
    ) || null;

  if (!parsed.subSubCategory) {
    return buildEmptyResult(parsed.confidence);
  }

  /* =========================
     STRICT CIRCUIT RULE
  ========================= */

  const circuitId = extractCircuitId(`${subject} ${body}`);

  if (!parsed.isIssue || !circuitId) {
    return buildEmptyResult(parsed.confidence);
  }

  parsed.circuitId = circuitId;

  /* =========================
     HIERARCHY RESOLUTION
  ========================= */

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
