import {
  pgTable,
  uuid,
  bigint,
  timestamp,
  pgEnum,
  check,
  index,
  text,
  jsonb
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";

import { users } from "./user.model";
import { resumes } from "./resume.model";
import { careerProfiles } from "./careerProfile.model";



export const statusType = pgEnum("operation_status", [
  "PENDING",
  "RESERVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED"
]);

export const featureType = pgEnum("operation_feature", [
  "RESUME",
  "INTERVIEW_PREP",
  "ROADMAP"
]);



export const operations = pgTable(
  "operations",
  {
    id: uuid("id")
      .primaryKey()
      .notNull()
      .defaultRandom(),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    resume_id: uuid("resume_id")
      .notNull()
      .references(() => resumes.id),

    career_profile_id: uuid("career_profile_id")
      .notNull()
      .references(() => careerProfiles.id),

    feature: featureType("feature").notNull(),

    cost: bigint("cost", { mode: "bigint" }).notNull(),

    status: statusType("status")
      .notNull()
      .default("PENDING"),

    resume_text_snapshot: text("resume_text_snapshot")
      .notNull(),

    profile_snapshot: jsonb("profile_snapshot")
      .notNull(),

    prompt_version: text("prompt_version")
      .notNull(),

    model_name: text("model_name")
      .notNull(),

    result: jsonb("result"),

    error: text("error"),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    started_at: timestamp("started_at", { withTimezone: true }),

    completed_at: timestamp("completed_at", { withTimezone: true })
  },

  (table) => [
    check(
      "operations_cost_positive",
      sql`${table.cost} > 0`
    ),

    index("operations_user_idx").on(table.user_id),

    index("operations_status_idx").on(table.status),

    index("operations_created_idx").on(table.created_at)
  ]
);