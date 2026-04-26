import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "../../src/utils/Jwt";

describe("JWT utilities", () => {
  const userId = "test-user-id-123";
  const fullname = "Test User";

  describe("generateAccessToken", () => {
    it("should generate a valid JWT string", () => {
      const token = generateAccessToken(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should contain the user_id in the payload", () => {
      const token = generateAccessToken(userId);
      const decoded = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,
      ) as any;
      expect(decoded.user_id).toBe(userId);
    });

    it("should expire based on ACCESS_TOKEN_EXPIRY", () => {
      const token = generateAccessToken(userId);
      const decoded = jwt.decode(token) as any;
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      // 1h = 3600 seconds
      expect(decoded.exp - decoded.iat).toBe(3600);
    });
  });

  describe("generateRefreshToken", () => {
    it("should generate a valid JWT string", () => {
      const token = generateRefreshToken(userId, fullname);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should contain user_id and name in the payload", () => {
      const token = generateRefreshToken(userId, fullname);
      const decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET as string,
      ) as any;
      expect(decoded.user_id).toBe(userId);
      expect(decoded.name).toBe(fullname);
    });

    it("should expire based on REFRESH_TOKEN_EXPIRY", () => {
      const token = generateRefreshToken(userId, fullname);
      const decoded = jwt.decode(token) as any;
      // 7d = 604800 seconds
      expect(decoded.exp - decoded.iat).toBe(604800);
    });
  });
});
