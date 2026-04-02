import dotenv from "dotenv";

dotenv.config();

function normalizeOrigin(origin) {
  if (!origin) return "";
  return String(origin)
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

function parseCorsOrigins(value) {
  if (!value) {
    return ["http://localhost:5173", "http://localhost:5174"];
  }

  if (value.trim() === "*") {
    return "*";
  }

  return value
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

export const env = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 4000),
  mongodbUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vital5_india",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGIN || process.env.CORS_ORIGINS),
  clinicalTrialsApiBase:
    process.env.CLINICAL_TRIALS_API_BASE || "https://clinicaltrials.gov/api/v2/studies",
  llmProvider: process.env.LLM_PROVIDER || "openai",
  openAIApiKey: process.env.OPENAI_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  openAIModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  groqModel: process.env.GROQ_MODEL || "llama3-70b-8192",
};
