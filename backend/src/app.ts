import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { globalLimiter } from "./middlewares/rateLimiter.middleware";
import { globalErrorHandler } from "./middlewares/errorHandler.middleware";

const app: Express = express();

// ── Security Headers ────────────────────────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

// ── Body Parsers ────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ── Rate Limiting (global) ──────────────────────────────────────────
app.use(globalLimiter);

// ── Routes ──────────────────────────────────────────────────────────
import userRouter from "./routes/user.routes";
import paymentRouter from "./routes/payment.routes";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/payments", paymentRouter);

// ── Health Check ────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// ── Global Error Handler (MUST be last) ─────────────────────────────
app.use(globalErrorHandler);

export { app };