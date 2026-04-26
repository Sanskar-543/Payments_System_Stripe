import dotenv from "dotenv";
import connectDB, { pool } from "./db/index.js";
import { app } from "./app.js";
import type { Server } from "http";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

let server: Server;

connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`⚙️ Server is running at port : ${PORT}`);
    });
  })
  .catch((err: unknown) => {
    console.error("Drizzle db connection failed !!!", err);
    process.exit(1);
  });

// ── Graceful Shutdown ───────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

  // 1. Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log("   ✅ HTTP server closed.");
    });
  }

  // 2. Drain the database connection pool
  try {
    await pool.end();
    console.log("   ✅ Database pool drained.");
  } catch (err) {
    console.error("   ❌ Error draining database pool:", err);
  }

  console.log("   👋 Goodbye.");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Catch unhandled rejections so the process doesn't silently die
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  // In production you may want to trigger shutdown here too
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  shutdown("uncaughtException");
});