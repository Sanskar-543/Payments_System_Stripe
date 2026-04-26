/**
 * Global test setup file.
 * Runs once before all test suites.
 *
 * Sets up environment variables needed by the test harness
 * so tests don't depend on a real .env file.
 */

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.ACCESS_TOKEN_EXPIRY = "1h";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.PORT = "5001";
process.env.ANALYSIS_COST = "20";
