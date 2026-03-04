import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./user.model";

export const careerProfiles = pgTable(
  "career_profiles",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    targetRole: text("target_role").notNull(),

    experienceYears: integer("experience_years").notNull(),

    skills: jsonb("skills").notNull(),

    interests: jsonb("interests"),

    preferences: jsonb("preferences"),

    additionalContext: jsonb("additional_context"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    {
      userIndex: index("career_profiles_user_idx").on(table.userId),
    },
  ],
);
