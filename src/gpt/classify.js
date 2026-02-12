import OpenAI from "openai";
import { SUB_SUB_CATEGORY } from "./schema.js";
import { validateGPTResult } from "./validator.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🔹 Flatten allowed SubSub list dynamically
const ALL_SUB_SUB = Object.values(SUB_SUB_CATEGORY)
  .flatMap(sub => Object.values(sub))
  .flat();

function trimBody(body, maxChars = 10000) {
  if (!body) return "";
  return body.length > maxChars
    ? body.slice(0, maxChars)
    : body;
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

export async function classifyEmailWithGPT({ subject, from, body }) {

  const input = `
Subject:
${subject}

From:
${from}

Body:
${trimBody(body)}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are a Telecom Service Incident Classifier for Optimal Telemedia.

Your job is to detect ONLY customer-facing telemedia service issues.

A valid issue MUST:
1. Be related to a telecom service provided by Optimal Telemedia.
2. Impact a customer MPLS, Internet, Fiber, Lease Line, or similar service.
3. Clearly match ONE of the allowed subSubCategory values below.
4. Be an ACTIVE fault (not resolved, not restored, not closed).

DO NOT classify as issue if:
- Monitoring alert only (ICMP, SNMP, Zabbix, system logs)
- Firewall/security alerts
- IPsec tunnel up notifications
- Vendor auto updates without confirmed outage
- Ticket closed / resolved / restored
- Informational update without impact

If subject or body contains:
resolved, restored, closed, link up, tunnel up, problem resolved
→ isIssue MUST be false

If content does NOT clearly match an allowed subSubCategory:
→ isIssue MUST be false
→ subSubCategory MUST be null

Never force classification.

Extract circuit ID ONLY if clearly visible.

Allowed subSubCategory values:
${ALL_SUB_SUB.map(v => `- ${v}`).join("\n")}

Return JSON only:

{
  "isIssue": boolean,
  "circuitId": string | null,
  "subSubCategory": string | null,
  "summary": string | null,
  "confidence": number
}
`
      },
      { role: "user", content: input }
    ]
  });

  const raw = res.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("GPT returned invalid JSON:\n" + raw);
  }

  if (typeof parsed.isIssue !== "boolean") {
    throw new Error("Invalid GPT structure");
  }

  // 🔹 Validate subSub strictly
  if (
    parsed.subSubCategory &&
    !ALL_SUB_SUB.includes(parsed.subSubCategory)
  ) {
    parsed.subSubCategory = null;
    parsed.isIssue = false;
  }

  // 🔹 Resolve hierarchy only if valid issue
  if (parsed.isIssue && parsed.subSubCategory) {
    const hierarchy = resolveHierarchy(parsed.subSubCategory);

    if (!hierarchy) {
      parsed.isIssue = false;
      parsed.subSubCategory = null;
    } else {
      parsed.caseReasonCategory = hierarchy.caseReasonCategory;
      parsed.subCategory = hierarchy.subCategory;
      parsed.priority = getPriority(hierarchy.caseReasonCategory);
    }
  }

  // 🔹 Final structural validation
  if (!validateGPTResult(parsed)) {
    throw new Error(
      "Validation failed:\n" + JSON.stringify(parsed, null, 2)
    );
  }

  return parsed;
}
