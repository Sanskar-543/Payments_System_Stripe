import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyRazorpaySignature } from "../../src/services/payment.service";
import crypto from "crypto";

// We mock the env variable used in payment.service.ts
const MOCK_SECRET = "placeholder_key_secret";

// Create a valid signature for tests
const createValidSignature = (orderId: string, paymentId: string) => {
  return crypto
    .createHmac("sha256", MOCK_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
};

describe("Razorpay Verification", () => {
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_KEY_SECRET", MOCK_SECRET);
  });

  it("should return true for a valid signature", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = createValidSignature(orderId, paymentId);

    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    expect(isValid).toBe(true);
  });

  it("should return false for an invalid signature", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = "invalid_signature_string";

    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    expect(isValid).toBe(false);
  });

  it("should return false if orderId or paymentId is tampered with", () => {
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = createValidSignature(orderId, paymentId);

    // Tamper with order ID
    expect(
      verifyRazorpaySignature("order_tampered", paymentId, signature),
    ).toBe(false);

    // Tamper with payment ID
    expect(verifyRazorpaySignature(orderId, "pay_tampered", signature)).toBe(
      false,
    );
  });
});
