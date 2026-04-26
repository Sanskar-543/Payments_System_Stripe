import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import {
  initiatePaymentService,
  verifyAndProcessPaymentService,
} from "../services/payment.service";

const createPaymentOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { amountINR } = req.body;
    const userId = req.user!.id;

    // Service handles Razorpay API call and DB insertion
    const orderDetails = await initiatePaymentService(userId, amountINR);

    return res
      .status(200)
      .json(new ApiResponse(200, orderDetails, "Order created successfully"));
  },
);

const verifyPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const userId = req.user!.id;

    // Service handles signature verification, credit ledger insertion, and wallet update
    await verifyAndProcessPaymentService(
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Payment verified and credits added"));
  },
);

export { createPaymentOrder, verifyPayment };
