let index = 0;

const circuits = (process.env.TEST_CIRCUITS || "")
  .split(",")
  .map(c => c.trim())
  .filter(Boolean);

export function getTestCircuitId() {
  if (!circuits.length) return "TEST-CIRCUIT";

  const id = circuits[index % circuits.length];
  index++;
  return id;
}
