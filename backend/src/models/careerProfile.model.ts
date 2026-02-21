import { pgTable, uuid } from "drizzle-orm/pg-core";

export const careerprofile = pgTable("careerprofiles", {
  id: uuid("id").notNull().primaryKey(),
});
