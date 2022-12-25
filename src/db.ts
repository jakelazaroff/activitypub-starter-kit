import { readFileSync } from "node:fs";

import Database from "better-sqlite3";

import { DATABASE_PATH, SCHEMA_PATH } from "./env.js";

const db = new Database(DATABASE_PATH);

const migration = readFileSync(SCHEMA_PATH);
db.exec(migration.toString());

interface Post {
  id: number;
  type: string;
  contents: object;
  uri: string;
  createdAt: Date;
}

export function listPosts(): Post[] {
  const results = db.prepare("SELECT * FROM posts").all();
  return results.map((result) => ({
    ...result,
    contents: JSON.parse(result.contents),
    createdAt: new Date(result.created_at),
  }));
}

interface Follower {
  id: number;
  actor: string;
  uri: string;
  createdAt: Date;
}

export function createFollower(input: { actor: string; uri: string }) {
  const query =
    "INSERT INTO followers (actor, uri) VALUES (?, ?) ON CONFLICT DO UPDATE SET uri = excluded.uri";
  db.prepare(query).bind(input.actor, input.uri).run();
}

export function listFollowers(): Follower[] {
  const results = db.prepare("SELECT * FROM followers").all();
  return results.map((result) => ({
    ...result,
    createdAt: new Date(result.created_at),
  }));
}

export async function deleteFollower(input: { actor: string; uri: string }) {
  db.prepare("DELETE FROM followers WHERE actor = ? AND uri = ?")
    .bind(input.actor, input.uri)
    .run();
}
