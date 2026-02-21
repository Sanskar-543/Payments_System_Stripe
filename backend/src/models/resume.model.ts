import { pgTable, uuid } from "drizzle-orm/pg-core";

export const resume = pgTable("resumes",{
    id: uuid("id").notNull().primaryKey()
})