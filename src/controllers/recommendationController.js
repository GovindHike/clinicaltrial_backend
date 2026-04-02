import { generateTreatmentRecommendation } from "../services/recommendationService.js";

export async function recommendTreatment(req, res, next) {
  try {
    const result = await generateTreatmentRecommendation(req.validatedBody);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
