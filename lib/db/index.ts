import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return postgres(url, { max: 10, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require" });
}

export function getDb() {
  globalForDb.__sql ??= makeClient();
  return drizzle(globalForDb.__sql, { schema });
}

export type Db = ReturnType<typeof getDb>;
export * from "./schema";
