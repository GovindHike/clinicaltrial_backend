import { z } from "zod";
import { SUPPORTED_DISEASES } from "../utils/constants.js";
import { HttpError } from "../utils/httpError.js";

export const recommendationInputSchema = z.object({
  age: z.number().int().min(1).max(120),
  gender: z.enum(["male", "female", "other"]),
  diseaseType: z.enum(SUPPORTED_DISEASES),
  symptoms: z.union([z.array(z.string().min(1)).min(1), z.string().min(2)]),
  comorbidities: z.array(z.string()).optional().default([]),
  previousMedications: z.array(z.string()).optional().default([]),
});

export function validateRecommendationRequest(req, _res, next) {
  const result = recommendationInputSchema.safeParse(req.body);
  if (!result.success) {
    return next(new HttpError(400, "Invalid request payload", result.error.flatten()));
  }

  req.validatedBody = result.data;
  next();
}
