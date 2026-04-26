import { describe, it, expect } from "vitest";
import { hashString, compareString } from "../../src/utils/bcrypt";

describe("bcrypt utilities", () => {
  const plainText = "mysecurepassword123";

  it("should hash a string and return a non-empty result", async () => {
    const hashed = await hashString(plainText);
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(plainText);
    expect(hashed.length).toBeGreaterThan(0);
  });

  it("should return true when comparing a string with its correct hash", async () => {
    const hashed = await hashString(plainText);
    const isMatch = await compareString(plainText, hashed);
    expect(isMatch).toBe(true);
  });

  it("should return false when comparing a string with a wrong hash", async () => {
    const hashed = await hashString(plainText);
    const isMatch = await compareString("wrongpassword", hashed);
    expect(isMatch).toBe(false);
  });

  it("should produce different hashes for the same input (salted)", async () => {
    const hash1 = await hashString(plainText);
    const hash2 = await hashString(plainText);
    expect(hash1).not.toBe(hash2);
  });
});
