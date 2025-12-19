// src/gpt/validator.js

import {
  CASE_REASON,
  SUB_CATEGORY,
  SUB_SUB_CATEGORY
} from "./schema.js";

export function validateGPTResult(r) {
  if (!r || typeof r !== "object") return false;

  if (r.isIssue === false) return true;

  if (!r.circuitId) return false;
  if (!CASE_REASON.includes(r.caseReasonCategory)) return false;

  const allowedSubs = SUB_CATEGORY[r.caseReasonCategory];
  if (!allowedSubs?.includes(r.subCategory)) return false;

  if (
    r.subSubCategory &&
    !SUB_SUB_CATEGORY.includes(r.subSubCategory)
  ) {
    return false;
  }

  return true;
}
