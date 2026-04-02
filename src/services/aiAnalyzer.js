import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { env } from "../config/env.js";
import { DISCLAIMER } from "../utils/constants.js";

function buildFallbackTreatments(scoredTrials = []) {
  return scoredTrials.slice(0, 3).map((trial, index) => ({
    rank: index + 1,
    name: trial.interventions[0] || trial.title || "Trial-based protocol",
    protocol: (trial.interventions || []).join(" + ") || "Refer trial protocol",
    success_rate: trial.successRateEstimate || "Not reported",
    side_effects: trial.sideEffectsSummary || "Not clearly reported",
    confidence: index === 0 ? "High" : index === 1 ? "Medium" : "Low",
    source: trial.nctId,
    explanation: `Ranked from completed ${trial.phase} trial with sample size ${trial.enrollment}.`,
  }));
}

function getFallbackResponse(scoredTrials, reason) {
  return {
    treatments: buildFallbackTreatments(scoredTrials),
    disclaimer: DISCLAIMER,
    analysisMode: "rule_based_fallback",
    analysisNote: reason,
  };
}

function hasProviderCredentials() {
  if (env.llmProvider === "groq") {
    return Boolean(env.groqApiKey && env.groqApiKey.trim());
  }
  return Boolean(env.openAIApiKey && env.openAIApiKey.trim());
}

function isAuthenticationError(error) {
  const message = String(error?.message || "").toLowerCase();
  const status = error?.status || error?.response?.status;
  return (
    status === 401 ||
    message.includes("you didn't provide an api key") ||
    message.includes("invalid api key") ||
    message.includes("authentication")
  );
}

const recommendationSchema = z.object({
  treatments: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(3),
        name: z.string(),
        protocol: z.string(),
        success_rate: z.string(),
        side_effects: z.string(),
        confidence: z.enum(["High", "Medium", "Low"]),
        source: z.string(),
        explanation: z.string(),
      })
    )
    .length(3),
});

function getModel() {
  if (env.llmProvider === "groq") {
    return new ChatGroq({
      apiKey: env.groqApiKey,
      model: env.groqModel,
      temperature: 0.1,
    });
  }

  return new ChatOpenAI({
    apiKey: env.openAIApiKey,
    model: env.openAIModel,
    temperature: 0.1,
  });
}

export async function analyzeTrialsWithAI({ patient, scoredTrials }) {
  if (!hasProviderCredentials()) {
    return getFallbackResponse(
      scoredTrials,
      "LLM API key not configured. Returned rule-based recommendations."
    );
  }

  const parser = new JsonOutputParser();
  const model = getModel();
  const prompt = ChatPromptTemplate.fromTemplate(`
You are a clinical evidence analysis engine for Indian physicians.
Analyze the following clinical trial data and return exactly 3 ranked treatment recommendations.

Must extract and include:
1. Treatment protocol
2. Success rate
3. Side effects
Rank top 3 treatments based on efficacy, safety, and relevance to Indian population.

Rules:
- Use trial evidence only from provided data.
- Prefer India and South Asia relevance.
- Keep language concise and clinically clear.
- Return valid JSON only.

Patient Profile:
{patient}

Clinical Trial Data:
{trials}

JSON Output format:
{format_instructions}
`);

  try {
    const chain = prompt.pipe(model).pipe(parser);

    const raw = await chain.invoke({
      patient: JSON.stringify(patient),
      trials: JSON.stringify(scoredTrials.slice(0, 15)),
      format_instructions: `{
        "treatments": [
          {
            "rank": 1,
            "name": "string",
            "protocol": "string",
            "success_rate": "string",
            "side_effects": "string",
            "confidence": "High | Medium | Low",
            "source": "NCT########",
            "explanation": "string"
          }
        ]
      }`,
    });

    const parsed = recommendationSchema.safeParse(raw);
    if (parsed.success) {
      return {
        ...parsed.data,
        disclaimer: DISCLAIMER,
        analysisMode: "llm",
      };
    }

    return getFallbackResponse(
      scoredTrials,
      "LLM response format mismatch. Returned rule-based recommendations."
    );
  } catch (error) {
    if (isAuthenticationError(error)) {
      return getFallbackResponse(
        scoredTrials,
        "LLM authentication failed. Check API key and provider configuration."
      );
    }

    return getFallbackResponse(
      scoredTrials,
      "LLM analysis unavailable. Returned rule-based recommendations."
    );
  }
}
