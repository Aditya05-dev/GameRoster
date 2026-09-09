import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  // A single bad client shouldn't crash the whole process.
  console.error("Unexpected error on idle PG client", err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
