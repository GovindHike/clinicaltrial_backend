import { Router } from "express";
import { recommendTreatment } from "../controllers/recommendationController.js";
import { validateRecommendationRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post("/recommend-treatment", validateRecommendationRequest, recommendTreatment);

export default router;
