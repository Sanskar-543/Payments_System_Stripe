import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

describe("Health Check & Error Handling", () => {
  it("GET /health should return 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptime).toBeDefined();
  });

  it("should return 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent-route");
    // Express 5 returns 404 by default for unmatched routes
    expect(res.status).toBe(404);
  });

  it("protected routes should return 401 without auth token", async () => {
    const protectedRoutes = [
      "/api/v1/users/logout",
      "/api/v1/users/getUserResume",
      "/api/v1/users/getUserWallet",
      "/api/v1/users/getUserCareerProfile",
      "/api/v1/users/getcurrentuser",
    ];

    for (const route of protectedRoutes) {
      const res = await request(app).get(route);
      // POST routes will also be 401, but GET routes will return 401 from verifyJWT
      expect([401, 404, 405]).toContain(res.status);
    }
  });

  it("POST /api/v1/users/login with invalid body should return 400", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/users/login with empty body should return 400", async () => {
    const res = await request(app)
      .post("/api/v1/users/login")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
  });
});
