import { describe, it, expect } from "vitest";
import { ApiError } from "../../src/utils/ApiError";

describe("ApiError", () => {
  it("should create an error with default values", () => {
    const error = new ApiError();
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe("Something Went Wrong");
    expect(error.success).toBe(false);
    expect(error.errors).toEqual([]);
  });

  it("should create an error with custom statusCode and message", () => {
    const error = new ApiError(404, "Not Found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Not Found");
    expect(error.success).toBe(false);
  });

  it("should carry custom error details", () => {
    const details = ["field1 is required", "field2 must be a number"];
    const error = new ApiError(400, "Validation failed", details);
    expect(error.errors).toEqual(details);
    expect(error.errors).toHaveLength(2);
  });

  it("should use provided stack trace when given", () => {
    const customStack = "Error: custom\n    at test.ts:1:1";
    const error = new ApiError(500, "oops", [], customStack);
    expect(error.stack).toBe(customStack);
  });

  it("should capture stack trace when none provided", () => {
    const error = new ApiError(500, "oops");
    expect(error.stack).toBeDefined();
    // Stack should include the test file path where it was created
    expect(error.stack).toContain("apiError.test.ts");
  });
});
