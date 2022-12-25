import { readFile } from "node:fs/promises";

import Database from "better-sqlite3";

import { DATABASE_PATH } from "./env";

async function setup() {
  const db = new Database(DATABASE_PATH);

  console.log("Running initial migration…");
  const migration = await readFile("./db/schema.sql");
  db.exec(migration.toString());
}

setup();
