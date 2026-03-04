import {
  pgTable,
  uuid,
  bigint,
  timestamp,
  pgEnum,
  check,
  index,
  uniqueIndex,
  Index,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.model";
import { resumes } from "./resume.model";
import { careerProfiles } from "./careerProfile.model";

export const statusType = pgEnum("statusType", [
  "PENDING",
  "RESERVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const featureType = pgEnum("featureType", [
  "RESUME",
  "INTERVIEW_PREP",
  "ROADMAP",
]);

export const operations = pgTable(
  "operations",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),
    resume_id: uuid("resume_id")
      .notNull()
      .references(() => resumes.id),
    careerProfile_id: uuid("careerProfile_id")
      .notNull()
      .references(() => careerProfiles.id),
    feature: featureType("feature"),
    cost: bigint("cost", { mode: "bigint" }).notNull(),
    status: statusType("status"),
    resume_text_snapshot: text("resume_text_snapshot").notNull(),
    profile_snapshot: jsonb("profile_snapshot").notNull(),
    prompt_version: text("prompt_version").notNull(),
    model_name: text("model_name").notNull(),
    result: jsonb("result"),
    createdAt: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    {
      costConstraint: check("costConstraint", sql`${table.cost} > 0`),
    },
  ],
);
