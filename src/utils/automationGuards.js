export function isAutomationEnabled() {
  return process.env.AUTOMATION_ENABLED === "true";
}

export function getAutomationMode() {
  return process.env.AUTOMATION_MODE || "READ_ONLY";
}

export function isInternalSender(email = "") {
  return email.endsWith(`@${process.env.INTERNAL_DOMAIN}`);
}

export function hasTestKeyword(subject = "") {
  const keyword = process.env.TEST_KEYWORD;
  return keyword && subject.includes(keyword);
}
