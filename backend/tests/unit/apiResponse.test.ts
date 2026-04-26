import { describe, it, expect } from "vitest";
import { ApiResponse } from "../../src/utils/ApiResponse";

describe("ApiResponse", () => {
  it("should mark success for status codes below 400", () => {
    const response = new ApiResponse(200, { id: 1 }, "OK");
    expect(response.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ id: 1 });
    expect(response.message).toBe("OK");
  });

  it("should mark failure for status codes >= 400", () => {
    const response = new ApiResponse(404, null, "Not Found");
    expect(response.success).toBe(false);
    expect(response.statusCode).toBe(404);
  });

  it("should default the message to 'Success'", () => {
    const response = new ApiResponse(201, { created: true });
    expect(response.message).toBe("Success");
  });

  it("should handle edge case at exactly 400", () => {
    const response = new ApiResponse(400, null);
    expect(response.success).toBe(false);
  });

  it("should handle edge case at 399", () => {
    const response = new ApiResponse(399, null);
    expect(response.success).toBe(true);
  });
});
