import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompt.js";
import { validateGPTResult } from "./validator.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Canonical allowed values
const CASE_REASON_MAP = {
  "service affecting": "Service Affecting",
  "non service affecting": "Non Service Affecting",
  "change request": "Change Request",
  "field visit": "Field Visit"
};

export async function classifyEmailWithGPT({ subject, from, body }) {
  const input = `
Subject:
${subject}

From:
${from}

Body:
${body}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input }
    ]
  });

  const raw = res.choices[0].message.content;

  console.log("🧠 RAW GPT RESPONSE:\n", raw);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GPT returned invalid JSON");
  }

  /* =========================
     🔧 NORMALIZATION LAYER
  ========================== */

  // Normalize Case Reason Category
  if (parsed.caseReasonCategory) {
    const key = parsed.caseReasonCategory.toLowerCase().trim();
    parsed.caseReasonCategory = CASE_REASON_MAP[key] ?? parsed.caseReasonCategory;
  }

  // Normalize confidence (95 → 0.95)
  if (typeof parsed.confidence === "number") {
    if (parsed.confidence > 1) {
      parsed.confidence = parsed.confidence / 100;
    }
  }

  // Safety: if classified, force isIssue
  if (
    parsed.caseReasonCategory &&
    parsed.subCategory &&
    parsed.subSubCategory
  ) {
    parsed.isIssue = true;
  }

  /* =========================
     ✅ VALIDATE AFTER FIXING
  ========================== */
  if (!validateGPTResult(parsed)) {
    throw new Error(
      "GPT output failed validation AFTER normalization:\n" +
      JSON.stringify(parsed, null, 2)
    );
  }

  return parsed;
}