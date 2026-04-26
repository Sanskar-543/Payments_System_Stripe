import { z } from "zod";

export const createOrderSchema = z.object({
  amountINR: z
    .number({
      error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .positive("Amount must be a positive number"),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string({ error: "Order ID is required" }).min(1),
  razorpay_payment_id: z.string({ error: "Payment ID is required" }).min(1),
  razorpay_signature: z.string({ error: "Signature is required" }).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
