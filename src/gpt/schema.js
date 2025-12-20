// src/gpt/schema.js

export const CASE_REASON = [
  "Service Affecting",
  "Non Service Affecting",
  "Change Request",
  "Field Visit"
];

export const SUB_CATEGORY = {
  "Service Affecting": [
    "Link Down"
  ],

  "Non Service Affecting": [
    "Link Issue",
    "Application Issue"
  ],

  "Change Request": [
    "BOD",
    "Configuration Change",
    "Site Shifting"
  ],

  "Field Visit": [
    "End Customer"
  ]
};

export const SUB_SUB_CATEGORY = {
  "Service Affecting": {
    "Link Down": [
      "Link Hard Down",
      "Link Partially Down",
      "Heavy Packet Drop",
      "RFO"
    ]
  },

  "Non Service Affecting": {
    "Link Issue": [
      "Packet Drop",
      "Link Flapping",
      "Slow Response Issue",
      "High Latency Issue",
      "Fiber High Power"
    ],
    "Application Issue": [
      "Website Access Issue",
      "Site Audit"
    ]
  },

  "Change Request": {
    "BOD": [
      "BOD For 1 To 7 Days",
      "BOD For 8 To 15 Days"
    ],
    "Configuration Change": [
      "Route Change",
      "Additional Route",
      "Additional IP",
      "Link Upgradation"
    ],
    "Site Shifting": [
      "Site Shifting On Same Premises"
    ]
  },

  "Field Visit": {
    "End Customer": [
      "End Customer Installation"
    ]
  }
};

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
