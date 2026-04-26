import Razorpay from "razorpay";
import crypto from "crypto";
import { ApiError } from "../utils/ApiError";
import { db } from "../db";
import { payments } from "../models/payment.model";
import { creditLedgers } from "../models/creditLedger.model";
import { wallets } from "../models/wallet.model";
import { eq, sql } from "drizzle-orm";

// Placeholder values per user request
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "placeholder_key_id";
const RAZORPAY_KEY_SECRET =
  process.env.RAZORPAY_KEY_SECRET || "placeholder_key_secret";

const CREDITS_PER_INR = 5;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (
  amountInPaise: number,
  receiptId: string,
) => {
  try {
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
    };
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to create Razorpay order");
  }
};

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
};

/**
 * Creates an order via Razorpay and logs it in the database as INITIATED.
 */
export const initiatePaymentService = async (
  userId: string,
  amountINR: number,
) => {
  const amountInPaise = amountINR * 100;
  const idempotencyKey = crypto.randomUUID();

  // Create the order via Razorpay API
  const order = await createRazorpayOrder(amountInPaise, idempotencyKey);

  // Record the initiated payment in our database
  await db.insert(payments).values({
    user_id: userId,
    amount_minor: BigInt(amountInPaise),
    status: "INITIATED",
    currency: "INR",
    razorpay_order_id: order.id,
    idempotency_key: idempotencyKey,
  });

  return {
    order_id: order.id,
    amount_minor: amountInPaise,
    currency: "INR",
  };
};

/**
 * Verifies Razorpay signature and processes the credits via a DB transaction.
 */
export const verifyAndProcessPaymentService = async (
  userId: string,
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string,
) => {
  // 1. Verify the Razorpay signature
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!isValid) {
    // Mark payment as failed if signature is invalid but we have the record
    await db
      .update(payments)
      .set({ status: "FAILED" })
      .where(eq(payments.razorpay_order_id, razorpay_order_id));

    throw new ApiError(400, "Invalid payment signature");
  }

  // 2. Process the successful payment atomically
  await db.transaction(async (tx) => {
    // Fetch the payment record
    const paymentRecords = await tx
      .select()
      .from(payments)
      .where(eq(payments.razorpay_order_id, razorpay_order_id));

    if (paymentRecords.length === 0) {
      throw new ApiError(404, "Payment record not found");
    }

    const payment = paymentRecords[0];

    // Ensure we don't process the same payment twice
    if (payment.status === "SUCCEDED") {
      return; // Already processed
    }

    // Update payment status
    await tx
      .update(payments)
      .set({
        status: "SUCCEDED",
        razorpay_payment_id,
        razorpay_signature,
      })
      .where(eq(payments.id, payment.id));

    // Calculate credits: amount_minor is in paise.
    // amountINR = amount_minor / 100
    // credits = amountINR * CREDITS_PER_INR
    const amountINR = Number(payment.amount_minor) / 100;
    const creditsToAdd = amountINR * CREDITS_PER_INR;

    // Add entry to credit ledger
    await tx.insert(creditLedgers).values({
      user_id: userId,
      payment_id: payment.id,
      delta: BigInt(creditsToAdd),
      entryType: "CREDIT",
    });

    // Update wallet balance
    await tx
      .update(wallets)
      .set({
        cachedBalance: sql`${wallets.cachedBalance} + ${BigInt(creditsToAdd)}`,
      })
      .where(eq(wallets.user_id, userId));
  });

  return { verified: true };
};
