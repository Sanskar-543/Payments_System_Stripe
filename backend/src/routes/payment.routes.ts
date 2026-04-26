import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { globalLimiter } from "../middlewares/rateLimiter.middleware";
import {
  createPaymentOrder,
  verifyPayment,
} from "../controllers/payment.controller";
import {
  createOrderSchema,
  verifyPaymentSchema,
} from "../validators/payment.validators";

const router = Router();

// Apply auth to all payment routes
router.use(verifyJWT);
router.use(globalLimiter);

router
  .route("/create-order")
  .post(validate(createOrderSchema), createPaymentOrder);

router
  .route("/verify")
  .post(validate(verifyPaymentSchema), verifyPayment);

export default router;
