import { SOUTH_ASIA_COUNTRIES } from "../utils/constants.js";

const phaseWeights = {
  "PHASE4": 1,
  "PHASE3": 0.85,
  "PHASE2": 0.7,
};

function normalizePhase(phase = "") {
  const cleaned = String(phase).replace(/[\s_\-]/g, "").toUpperCase();
  if (cleaned.includes("PHASE4")) return "PHASE4";
  if (cleaned.includes("PHASE3")) return "PHASE3";
  if (cleaned.includes("PHASE2")) return "PHASE2";
  return "UNKNOWN";
}

function parseSuccessRate(value) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const match = String(value).match(/(\d+(\.\d+)?)%?/);
  return match ? Number(match[1]) : 0;
}

function geographyBoost(countries = []) {
  if (!Array.isArray(countries)) return 0;
  const indiaMatch = countries.some((country) => country?.toLowerCase() === "india");
  if (indiaMatch) return 1;

  const southAsiaMatch = countries.some((country) =>
    SOUTH_ASIA_COUNTRIES.map((item) => item.toLowerCase()).includes(String(country).toLowerCase())
  );
  return southAsiaMatch ? 0.7 : 0.2;
}

export function computeRuleBasedScore(trial) {
  const phase = normalizePhase(trial.phase);
  const phaseScore = phaseWeights[phase] || 0.2;
  const enrollmentScore = Math.min(Number(trial.enrollment || 0) / 1500, 1);
  const successScore = parseSuccessRate(trial.successRateEstimate) / 100;
  const geographyScore = geographyBoost(trial.countries);

  const totalScore =
    phaseScore * 0.3 + enrollmentScore * 0.2 + successScore * 0.35 + geographyScore * 0.15;

  return Number(totalScore.toFixed(4));
}

export function scoreAndSortTrials(trials = []) {
  return trials
    .map((trial) => ({
      ...trial,
      ruleScore: computeRuleBasedScore(trial),
    }))
    .sort((a, b) => b.ruleScore - a.ruleScore);
}
