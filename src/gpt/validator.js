// src/gpt/validator.js

import {
  CASE_REASON,
  SUB_CATEGORY,
  SUB_SUB_CATEGORY
} from "./schema.js";

export function validateGPTResult(r) {
  if (!r || typeof r !== "object") return false;

  // no issue → always valid
  if (r.isIssue === false) return true;

  if (!r.circuitId) return false;

  // validate case reason
  if (!CASE_REASON.includes(r.caseReasonCategory)) return false;

  // validate sub category
  const allowedSubs = SUB_CATEGORY[r.caseReasonCategory];
  if (!allowedSubs || !allowedSubs.includes(r.subCategory)) {
    return false;
  }

  // validate sub-sub category (nested)
  if (r.subSubCategory) {
    const allowedSubSubs =
      SUB_SUB_CATEGORY?.[r.caseReasonCategory]?.[r.subCategory];

    if (
      !Array.isArray(allowedSubSubs) ||
      !allowedSubSubs.includes(r.subSubCategory)
    ) {
      return false;
    }
  }

  return true;
}
