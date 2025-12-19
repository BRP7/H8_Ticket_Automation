// src/gpt/schema.js

export const CASE_REASON = [
  "Service Affecting",
  "Non Service Affecting",
  "Change Request",
  "Field Visit"
];

export const SUB_CATEGORY = {
  "Service Affecting": [
    "Link Down",
    "PoP Down"
  ],
  "Non Service Affecting": [
    "Link Issue",
    "Packet Drop",
    "High Latency Issue",
    "Slow Response Issue"
  ],
  "Change Request": [
    "BOD",
    "Configuration Change",
    "Site Shifting"
  ],
  "Field Visit": [
    "Site Visit Required"
  ]
};

export const SUB_SUB_CATEGORY = [
  "Link Hard Down",
  "Link Partially Down",
  "Link Flapping",
  "Heavy Packet Drop",
  "Intermittent Issue",
  "BOD for 1 to 7 Days",
  "BOD for 8 to 15 Days",
  "Configuration Change",
  "Site Shifting"
];

// canonical output shape
export const EMPTY_RESULT = {
  isIssue: false,
  confidence: 0,
  circuitId: null,
  caseReasonCategory: null,
  subCategory: null,
  subSubCategory: null,
  priority: "Medium",
  summary: null,
  signals: []
};
