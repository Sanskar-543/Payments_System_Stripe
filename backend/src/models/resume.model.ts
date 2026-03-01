import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { user } from "./user.model";

export const resume = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().notNull(),

    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    rawText: text("raw_text").notNull(),

    parsedData: jsonb("parsed_data").notNull(),

    metadata: jsonb("metadata"),

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