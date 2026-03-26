import { uuid } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";
import { resumes } from "./resume.model";
import { text } from "drizzle-orm/pg-core";
import { bigint } from "drizzle-orm/pg-core";
import { jsonb } from "drizzle-orm/pg-core";

export const status_Type = pgEnum("status_Type", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const analysis = pgTable("analysis", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  resume_id: uuid("resume_id")
    .notNull()
    .references(() => resumes.id),
  targetRole: text("targetRole").notNull(),
  targetCountry: text("targetCountry").notNull(),
  jobDescription: text("jobDescription").notNull(),
  matchScore: bigint("matchScore", { mode: "bigint" }),
  gapAnalysis: jsonb("gapAnalysis").notNull(),
  roadmap: jsonb("roadmap").notNull(),
  projectIdeas: jsonb("projectIdeas").notNull(),
  status: status_Type().notNull().default("PENDING"),
});
