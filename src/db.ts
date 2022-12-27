import crypto from "node:crypto";
import { readFileSync } from "node:fs";

import Database from "better-sqlite3";

import { DATABASE_PATH, SCHEMA_PATH } from "./env.js";

const db = new Database(DATABASE_PATH);

const migration = readFileSync(SCHEMA_PATH);
db.exec(migration.toString());

interface Post {
  id: string;
  contents: object;
  createdAt: Date;
}

export function createPost(object: object): Post {
  const id = crypto.randomUUID();

  const result = db
    .prepare("INSERT INTO posts (id, contents) VALUES (?, ?) RETURNING *")
    .get(id, JSON.stringify(object));

  return {
    ...result,
    contents: JSON.parse(result.contents),
    createdAt: new Date(result.created_at),
  };
}

export function listPosts(): Post[] {
  const results = db.prepare("SELECT * FROM posts").all();
  return results.map((result) => ({
    ...result,
    contents: JSON.parse(result.contents),
    createdAt: new Date(result.created_at),
  }));
}

export function findPost(id: string): Post | undefined {
  const result = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);

  if (!result) return;
  return {
    ...result,
    createdAt: new Date(result.created_at),
  };
}

interface Follower {
  id: string;
  actor: string;
  uri: string;
  createdAt: Date;
}

export function createFollower(input: { actor: string; uri: string }) {
  db.prepare(
    "INSERT INTO followers (id, actor, uri) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET uri = excluded.uri"
  ).run(crypto.randomUUID(), input.actor, input.uri);
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

interface Following {
  id: string;
  actor: string;
  uri: string;
  confirmed: boolean;
  createdAt: Date;
}

export function createFollowing(input: { actor: string; uri: string }) {
  db.prepare(
    "INSERT INTO following (id, actor, uri) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET uri = excluded.uri"
  ).run(crypto.randomUUID(), input.actor, input.uri);
}

export function listFollowing(): Following[] {
  const results = db.prepare("SELECT * FROM following").all();
  return results.map((result) => ({
    ...result,
    confirmed: Boolean(result.confirmed),
    createdAt: new Date(result.created_at),
  }));
}

export function getFollowing(actor: string): Following | undefined {
  const result = db
    .prepare("SELECT * FROM following WHERE actor = ?")
    .get(actor);

  if (!result) return;
  return {
    ...result,
    confirmed: Boolean(result.confirmed),
    createdAt: new Date(result.created_at),
  };
}

export function updateFollowing(input: {
  actor: string;
  uri: string;
  confirmed: boolean;
}) {
  db.prepare(
    "UPDATE following SET confirmed = ? WHERE actor = ? AND uri = ?"
  ).run(Number(input.confirmed), input.actor, input.uri);
}

export async function deleteFollowing(input: { actor: string; uri: string }) {
  db.prepare("DELETE FROM following WHERE actor = ? AND uri = ?")
    .bind(input.actor, input.uri)
    .run();
}
