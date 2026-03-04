import { pgTable, uuid, timestamp, bigint, check } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { sql } from "drizzle-orm";

export const wallets = pgTable(
  "wallets",
  {
    user_id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    cachedBalance: bigint("cached_balance", { mode: "bigint" })
      .notNull()
      .default(0n),
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
