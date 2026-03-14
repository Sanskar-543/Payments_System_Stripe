import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./user.model";
import { pgEnum } from "drizzle-orm/pg-core";

export const statusType = pgEnum("statusType", [
  "PROCESSING",
  "EXTRACTING",
  "EXTRACTED",
  "SUMMARY_PENDING",
  "SUMMARIZED",
  "AI_READY",
  "FAILED",
]);

export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    status: statusType("status"),

    cloudinaryUrl: text("cloudinaryUrl").notNull(),

    rawText: text("raw_text").notNull(),

    parsedData: jsonb("parsed_data").notNull(),

    metadata: jsonb("metadata"),

    summary: jsonb("summary").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
     {
      userIndex: index("resumes_user_idx").on(table.userId),

      uniqueResumeNamePerUser: uniqueIndex(
        "unique_resume_name_per_user"
      ).on(table.userId, table.name),
    }
  ]
);

export type resumetype = typeof resumes.$inferSelect;