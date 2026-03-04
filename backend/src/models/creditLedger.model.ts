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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.model";
import { operations } from "./operation.model";
import { payments } from "./payment.model";

export const creditEntryType = pgEnum("creditEntryType", [
  "CREDIT",
  "DEBIT",
  "RESERVATION",
]);

export const reservationStatusType = pgEnum("reservationStatus", [
  "PENDING",
  "CONFIRMED",
  "RELEASED",
]);

export const creditLedgers = pgTable(
  "creditLedger",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id),

    operation_id: uuid("operation_id").references(() => operations.id, {
      onDelete: "cascade",
    }),

    payment_id: uuid("payment_id").references(() => payments.id, {
      onDelete: "cascade",
    }),

    delta: bigint("delta", { mode: "bigint" }).notNull(),

    entryType: creditEntryType("entryType").notNull(),

    reservationStatus: reservationStatusType("reservationStatus"),

    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expiresAt", { withTimezone: true }),
  },
  (table) => [
    {
      deltaNonZero: check("deltaNonZero", sql`${table.delta} <> 0`),

      creditTypeSign: check(
        "creditTypeSign",
        sql`(${table.entryType} = "CREDIT" AND ${table.delta} > 0)
          OR 
          (${table.entryType} in ("DEBIT","RESERVATION") AND ${table.delta} < 0)`,
      ),

      reservationRequiresOperation: check(
        "reservationRequiresOperation",
        sql`${table.entryType} <> "RESERVATION"
        OR
        ${table.operation_id} IS NOT NULL 
        `,
      ),

      reservationRequiresStatus: check(
        "reservationRequiresStatus",
        sql`(${table.entryType} = "RESERVATION" AND ${table.reservationStatus} IS NOT NULL) 
        OR
        (${table.entryType} <> "RESERVATION" AND ${table.reservationStatus} IS NULL)`,
      ),

      userIndex: index("userIndex").on(table.user_id),

      uniqueOperationperReservation: uniqueIndex(
        "uniqueOperationperReservation",
      )
        .on(table.operation_id)
        .where(sql`${table.entryType} = "RESERVATION"`),

      uniqueCreditperPayment: uniqueIndex("uniqueCreditperPayment")
        .on(table.payment_id)
        .where(sql`${table.entryType} = "CREDIT"`),
    },
  ],
);
