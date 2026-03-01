import { pgTable, uuid, timestamp, bigint, check } from "drizzle-orm/pg-core";
import { user } from "./user.model";
import { sql } from "drizzle-orm";

export const wallet = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey(),
    user_id: uuid("id").references(() => user.id, { onDelete: "cascade" }),
    cachedBalance: bigint("cached_balance", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    {
      nonNegativeBalance: check(
        "wallet_balance_non_negative",
        sql`${table.cachedBalance} >= 0`,
      ),
    },
  ],
);
