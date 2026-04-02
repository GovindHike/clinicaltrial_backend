import axios from "axios";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const diseaseQueryMap = {
  "Diabetes Type 1": "Diabetes Mellitus, Type 1",
  "Diabetes Type 2": "Diabetes Mellitus, Type 2",
  Hypertension: "Hypertension",
  "Ischemic Heart Disease": "Ischemic Heart Disease",
  Tuberculosis: "Tuberculosis",
  "MDR-TB": "Multidrug-Resistant Tuberculosis",
  COPD: "Chronic Obstructive Pulmonary Disease",
  "Lung Diseases": "Lung Diseases",
  Asthma: "Asthma",
};

function getCountriesFromLocations(locations = []) {
  return locations
    .map((location) => location?.facility?.address?.country)
    .filter(Boolean)
    .filter((country, index, array) => array.indexOf(country) === index);
}

function estimateSuccessRate(outcomes = []) {
  const allTexts = outcomes
    .map((item) => item?.title || item?.description || "")
    .join(" ")
    .toLowerCase();

  const percentMatch = allTexts.match(/(\d+(\.\d+)?)\s?%/);
  if (percentMatch) return `${percentMatch[1]}%`;
  return "Not explicitly reported";
}

function normalizeStudy(study) {
  const protocol = study.protocolSection || {};
  const derived = study.derivedSection || {};
  const resultSection = study.resultsSection || {};

  const idModule = protocol.identificationModule || {};
  const statusModule = protocol.statusModule || {};
  const designModule = protocol.designModule || {};
  const contactsModule = protocol.contactsLocationsModule || {};
  const interventions = protocol.armsInterventionsModule?.interventions || [];
  const outcomes = protocol.outcomesModule?.primaryOutcomes || [];
  const adverseEvents = resultSection.adverseEventsModule?.eventGroups || [];

  return {
    nctId: idModule.nctId || "",
    title: idModule.briefTitle || "",
    conditions: protocol.conditionsModule?.conditions || [],
    phase: (designModule.phases || []).join(", ") || "Unknown",
    enrollment: designModule.enrollmentInfo?.count || 0,
    status: statusModule.overallStatus || "",
    hasResults: Boolean(study?.hasResults ?? derived?.hasResults),
    interventions: interventions.map((item) => item.name).filter(Boolean),
    outcomeMeasures: outcomes.map((item) => item.measure).filter(Boolean),
    sideEffectsSummary:
      adverseEvents.map((event) => event.title).filter(Boolean).join(", ") ||
      "No major adverse events reported",
    locations: contactsModule.locations || [],
    countries: getCountriesFromLocations(contactsModule.locations || []),
    successRateEstimate: estimateSuccessRate(outcomes),
    sourceUrl: idModule.nctId
      ? `https://clinicaltrials.gov/study/${idModule.nctId}`
      : "https://clinicaltrials.gov",
  };
}

function isPreferredPhase(phaseText = "") {
  const normalized = String(phaseText).toUpperCase().replace(/[\s_\-]/g, "");
  return normalized.includes("PHASE2") || normalized.includes("PHASE3") || normalized.includes("PHASE4");
}

export async function fetchTrialsByDisease(diseaseType) {
  try {
    const condition = diseaseQueryMap[diseaseType] || diseaseType;
    const response = await axios.get(env.clinicalTrialsApiBase, {
      params: {
        "query.cond": condition,
        "filter.overallStatus": "COMPLETED",
        pageSize: 100,
        format: "json",
      },
      timeout: 20000,
    });

    const studies = response.data?.studies || [];
    const filtered = studies
      .map(normalizeStudy)
      .filter((study) => study.status === "COMPLETED" && study.hasResults);

    return filtered.sort((a, b) => {
      const aPreferred = isPreferredPhase(a.phase) ? 1 : 0;
      const bPreferred = isPreferredPhase(b.phase) ? 1 : 0;
      return bPreferred - aPreferred;
    });
  } catch (error) {
    throw new HttpError(502, "Failed to fetch clinical trials", {
      message: error.message,
    });
  }
}
