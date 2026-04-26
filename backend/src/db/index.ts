import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}/${process.env.DATABASE_NAME}`;

if (!connectionString) {
  throw new Error("Database connection string is missing");
}

const pool = new Pool({
  connectionString,
});

const db = drizzle(pool);

const connectDB = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    console.log("Drizzle connected successfully");
  } catch (error: unknown) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};

export { db, pool };
export default connectDB;
