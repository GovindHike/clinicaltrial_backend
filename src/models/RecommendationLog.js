import mongoose from "mongoose";

const recommendationLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    diseaseType: { type: String, required: true, index: true },
    ageBand: { type: String, required: true },
    gender: { type: String, required: true },
    symptomCount: { type: Number, default: 0 },
    comorbidityCount: { type: Number, default: 0 },
    previousMedicationCount: { type: Number, default: 0 },
    recommendations: { type: Array, default: [] },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const RecommendationLog = mongoose.model(
  "recommendation_logs",
  recommendationLogSchema
);
