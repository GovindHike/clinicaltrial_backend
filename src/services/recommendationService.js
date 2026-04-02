import crypto from "crypto";
import { RecommendationLog } from "../models/RecommendationLog.js";
import { TrialCache } from "../models/TrialCache.js";
import { fetchTrialsByDisease } from "./trialFetcher.js";
import { scoreAndSortTrials } from "./rankingService.js";
import { analyzeTrialsWithAI } from "./aiAnalyzer.js";

const CACHE_TTL_HOURS = 24;

function getAgeBand(age) {
  if (age < 18) return "0-17";
  if (age < 35) return "18-34";
  if (age < 50) return "35-49";
  if (age < 65) return "50-64";
  return "65+";
}

function mapTrialToEvidenceItem(trial, index) {
  return {
    rank: index + 1,
    name: trial.interventions?.[0] || trial.title || "Trial-based protocol",
    protocol: (trial.interventions || []).join(" + ") || "Refer trial protocol",
    success_rate: trial.successRateEstimate || "Not reported",
    side_effects: trial.sideEffectsSummary || "Not clearly reported",
    source: trial.nctId,
    phase: trial.phase,
    enrollment: trial.enrollment,
    rule_score: trial.ruleScore,
  };
}

async function getTrialsFromCacheOrApi(diseaseType) {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
  const cached = await TrialCache.findOne({
    diseaseType,
    fetchedAt: { $gte: cutoff },
  })
    .sort({ fetchedAt: -1 })
    .lean();

  if (cached?.trials?.length) {
    return cached.trials;
  }

  const trials = await fetchTrialsByDisease(diseaseType);
  await TrialCache.create({
    diseaseType,
    trialCount: trials.length,
    trials,
  });

  return trials;
}

export async function generateTreatmentRecommendation(patientInput) {
  const trials = await getTrialsFromCacheOrApi(patientInput.diseaseType);
  const scoredTrials = scoreAndSortTrials(trials);
  const aiRecommendation = await analyzeTrialsWithAI({
    patient: patientInput,
    scoredTrials,
  });

  const requestId = crypto.randomUUID();
  await RecommendationLog.create({
    requestId,
    diseaseType: patientInput.diseaseType,
    ageBand: getAgeBand(patientInput.age),
    gender: patientInput.gender,
    symptomCount: Array.isArray(patientInput.symptoms)
      ? patientInput.symptoms.length
      : String(patientInput.symptoms).split(",").filter(Boolean).length,
    comorbidityCount: patientInput.comorbidities?.length || 0,
    previousMedicationCount: patientInput.previousMedications?.length || 0,
    recommendations: aiRecommendation.treatments,
  });

  return {
    requestId,
    diseaseType: patientInput.diseaseType,
    recommendations: aiRecommendation.treatments,
    allRankedTreatments: scoredTrials.map(mapTrialToEvidenceItem),
    disclaimer: aiRecommendation.disclaimer,
    trialCountAnalyzed: scoredTrials.length,
  };
}
