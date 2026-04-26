import { describe, it, expect } from "vitest";
import {
  signUpSchema,
  loginSchema,
  changePasswordSchema,
  updateUserDetailsSchema,
} from "../../src/validators/user.validators";

describe("Zod Validators", () => {
  // ── signUpSchema ──────────────────────────────────────────────
  describe("signUpSchema", () => {
    it("should pass with valid input and transform email/username", () => {
      const result = signUpSchema.parse({
        email: "  TEST@Email.COM  ",
        username: "  cool_user  ",
        fullName: "  John Doe  ",
        password: "securepass123",
      });
      expect(result.email).toBe("test@email.com");
      expect(result.username).toBe("cool_user");
      expect(result.fullName).toBe("John Doe");
    });

    it("should reject invalid email", () => {
      expect(() =>
        signUpSchema.parse({
          email: "not-an-email",
          username: "user1",
          fullName: "John",
          password: "securepass123",
        }),
      ).toThrow();
    });

    it("should reject short username", () => {
      expect(() =>
        signUpSchema.parse({
          email: "a@b.com",
          username: "ab",
          fullName: "John",
          password: "securepass123",
        }),
      ).toThrow();
    });

    it("should reject username with special characters", () => {
      expect(() =>
        signUpSchema.parse({
          email: "a@b.com",
          username: "user name!",
          fullName: "John",
          password: "securepass123",
        }),
      ).toThrow();
    });

    it("should reject short password", () => {
      expect(() =>
        signUpSchema.parse({
          email: "a@b.com",
          username: "user1",
          fullName: "John",
          password: "short",
        }),
      ).toThrow();
    });

    it("should reject missing fields", () => {
      expect(() => signUpSchema.parse({})).toThrow();
    });
  });

  // ── loginSchema ───────────────────────────────────────────────
  describe("loginSchema", () => {
    it("should pass with valid input", () => {
      const result = loginSchema.parse({
        email: "User@Test.com",
        password: "mypassword",
      });
      expect(result.email).toBe("user@test.com");
    });

    it("should reject missing password", () => {
      expect(() =>
        loginSchema.parse({ email: "a@b.com" }),
      ).toThrow();
    });
  });

  // ── changePasswordSchema ──────────────────────────────────────
  describe("changePasswordSchema", () => {
    it("should pass with valid passwords", () => {
      const result = changePasswordSchema.parse({
        oldPassword: "oldpass123",
        newPassword: "newpass123",
      });
      expect(result).toBeDefined();
    });

    it("should reject short new password", () => {
      expect(() =>
        changePasswordSchema.parse({
          oldPassword: "oldpass123",
          newPassword: "short",
        }),
      ).toThrow();
    });
  });

  // ── updateUserDetailsSchema ───────────────────────────────────
  describe("updateUserDetailsSchema", () => {
    it("should pass with only fullName", () => {
      const result = updateUserDetailsSchema.parse({ fullName: "New Name" });
      expect(result.fullName).toBe("New Name");
    });

    it("should pass with only username", () => {
      const result = updateUserDetailsSchema.parse({ username: "new_user" });
      expect(result.username).toBe("new_user");
    });

    it("should reject empty object (at least one field required)", () => {
      expect(() => updateUserDetailsSchema.parse({})).toThrow();
    });
  });
});
