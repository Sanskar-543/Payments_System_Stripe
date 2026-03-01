import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),

    username: text("username").notNull().unique(),

    fullName: text("full_name").notNull(),

    passwordHash: text("password_hash").notNull(),

    refreshToken: text("refreshToken").notNull(),

    usernameLastChangedAt: timestamp("username_last_changed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    {
      emailUnique: uniqueIndex("users_email_unique").on(table.email),
      usernameUnique: uniqueIndex("users_username_unique").on(table.username),
    },
  ],
);
