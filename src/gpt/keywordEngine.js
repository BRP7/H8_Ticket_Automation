import { SUB_SUB_CATEGORY } from "./schema.js";

/*
  This engine:
  - Matches email content against known SubSubCategory signals
  - Automatically back-maps to SubCategory and CaseReason
  - NEVER guesses categories
*/

const SIGNALS = {
  "Link Hard Down": [
    "link down",
    "internet down",
    "no connectivity",
    "service down",
    "completely down",
    "interface down",
    "fiber cut"
  ],

  "Link Partially Down": [
    "partial down",
    "partially down"
  ],

  "Heavy Packet Drop": [
    "heavy packet drop"
  ],

  "Packet Drop": [
    "packet drop"
  ],

  "Link Flapping": [
    "link flapping",
    "flapping"
  ],

  "High Latency Issue": [
    "high latency",
    "latency",
    "slow browsing",
    "slow speed",
    "slow response"
  ],

  "Fiber High Power": [
    "fiber high power"
  ],

  "RFO": [
    "rfo",
    "root cause"
  ],

  "Website Access Issue": [
    "website not opening",
    "application not accessible",
    "website issue"
  ],

  "Site Audit": [
    "site audit"
  ],

  "Route Change": [
    "route change"
  ],

  "Additional Route": [
    "additional route"
  ],

  "Additional IP": [
    "additional ip"
  ],

  "Link Upgradation": [
    "link upgradation",
    "upgrade link"
  ],

  "BOD For 1 To 7 Days": [
    "bandwidth on demand",
    "bod"
  ],

  "BOD For 8 To 15 Days": [
    "bod 8",
    "bod 15"
  ],

  "Site Shifting On Same Premises": [
    "site shifting"
  ],

  "End Customer Installation": [
    "site visit",
    "installation",
    "field visit"
  ]
};

export function mapToTicketCategory(job, gptResult) {

  if (!gptResult.isIssue) return null;

  const text = `${job.subject} ${job.bodyText}`.toLowerCase();

  for (const [subSub, patterns] of Object.entries(SIGNALS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        return buildHierarchy(subSub);
      }
    }
  }

  return null;
}

function buildHierarchy(subSubCategory) {

  for (const [caseReason, subMap] of Object.entries(SUB_SUB_CATEGORY)) {

    for (const [subCategory, subSubList] of Object.entries(subMap)) {

      if (subSubList.includes(subSubCategory)) {

        return {
          caseReasonCategory: caseReason,
          subCategory,
          subSubCategory,
          priority: getPriority(caseReason)
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
