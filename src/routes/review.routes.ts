import { Router } from "express";

import {
  createCustomerReview,
  getProductReviewList,
  getCustomerReviews,
} from "../controllers/review.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Public approved reviews.
 */
router.get("/product/:productId", getProductReviewList);

/*
 * Customer-only review submission.
 */
router.post("/", authenticate, createCustomerReview);

router.get("/mine", authenticate, getCustomerReviews);

export default router;
