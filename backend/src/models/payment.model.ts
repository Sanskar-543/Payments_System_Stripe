import {
  bigint,
  char,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { check } from "drizzle-orm/gel-core";
import { sql } from "drizzle-orm";

export const statusType = pgEnum("statusType", [
  "INITIATED",
  "SUCCEDED",
  "FAILED",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, {onDelete: "cascade"}),

    amount_minor: bigint("amount_minor", { mode: "bigint" }).notNull(),

    status: statusType("status"),
    currency: char("currency",{length: 3}).notNull(),
    razorpay_order_id: varchar("razorpay_order_id", { length: 255 })
      .unique()
      .notNull(),
    razorpay_payment_id: varchar("razorpay_payment_id", { length: 255 })
      .unique(),
    razorpay_signature: text("razorpay_signature"),

    idempotency_key: text("idempotency_key").unique().notNull(),

    created_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [{
    amountConstraint: check("amountConstraint",sql`${table.amount_minor} > 0`),
    unique_razorpay_order_id: uniqueIndex("unique_razorpay_order_id").on(table.razorpay_order_id),
    unique_razorpay_payment_id: uniqueIndex("unique_razorpay_payment_id").on(table.razorpay_payment_id),
    unique_idempotency_key: uniqueIndex("unique_idempotency_key").on(table.idempotency_key)
  }],
);
