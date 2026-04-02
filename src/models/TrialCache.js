import mongoose from "mongoose";

const trialCacheSchema = new mongoose.Schema(
  {
    diseaseType: { type: String, required: true, index: true },
    fetchedAt: { type: Date, default: Date.now, index: true },
    source: { type: String, default: "clinicaltrials.gov-v2" },
    trialCount: { type: Number, default: 0 },
    trials: { type: Array, default: [] },
  },
  { versionKey: false }
);

trialCacheSchema.index({ diseaseType: 1, fetchedAt: -1 });

export const TrialCache = mongoose.model("trials_cache", trialCacheSchema);
