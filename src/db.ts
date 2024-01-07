import crypto from "node:crypto";
import { readFileSync } from "node:fs";

import Database from "better-sqlite3";

interface Post {
  id: string;
  contents: object;
  createdAt: Date;
}

interface Follower {
  id: string;
  actor: string;
  uri: string;
  createdAt: Date;
}

interface Following {
  id: string;
  actor: string;
  uri: string;
  confirmed: boolean;
  createdAt: Date;
}

export class Db {
  private readonly db;

  constructor(database: string, schema: string) {
    this.db = new Database(database);
    const migration = readFileSync(schema);
    this.db.exec(migration.toString());
  }

  createPost(object: object): Post {
    const id = crypto.randomUUID();

    const result = this.db
      .prepare("INSERT INTO posts (id, contents) VALUES (?, ?) RETURNING *")
      .get(id, JSON.stringify(object));

    return {
      ...result,
      contents: JSON.parse(result.contents),
      createdAt: new Date(result.created_at),
    };
  }

  listPosts(): Post[] {
    const results = this.db.prepare("SELECT * FROM posts").all();
    return results.map((result) => ({
      ...result,
      contents: JSON.parse(result.contents),
      createdAt: new Date(result.created_at),
    }));
  }

  findPost(id: string): Post | undefined {
    const result = this.db.prepare("SELECT * FROM posts WHERE id = ?").get(id);

    if (!result) return;
    return {
      ...result,
      createdAt: new Date(result.created_at),
    };
  }

  createFollower(input: { actor: string; uri: string }) {
    this.db
      .prepare(
        "INSERT INTO followers (id, actor, uri) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET uri = excluded.uri",
      )
      .run(crypto.randomUUID(), input.actor, input.uri);
  }

  listFollowers(): Follower[] {
    const results = this.db.prepare("SELECT * FROM followers").all();
    return results.map((result) => ({
      ...result,
      createdAt: new Date(result.created_at),
    }));
  }

  deleteFollower(input: { actor: string; uri: string }) {
    this.db
      .prepare("DELETE FROM followers WHERE actor = ? AND uri = ?")
      .bind(input.actor, input.uri)
      .run();
  }

  createFollowing(input: { actor: string; uri: string }) {
    this.db
      .prepare(
        "INSERT INTO following (id, actor, uri) VALUES (?, ?, ?) ON CONFLICT DO UPDATE SET uri = excluded.uri",
      )
      .run(crypto.randomUUID(), input.actor, input.uri);
  }

  listFollowing(): Following[] {
    const results = this.db.prepare("SELECT * FROM following").all();
    return results.map((result) => ({
      ...result,
      confirmed: Boolean(result.confirmed),
      createdAt: new Date(result.created_at),
    }));
  }

  getFollowing(actor: string): Following | undefined {
    const result = this.db
      .prepare("SELECT * FROM following WHERE actor = ?")
      .get(actor);

    if (!result) return;
    return {
      ...result,
      confirmed: Boolean(result.confirmed),
      createdAt: new Date(result.created_at),
    };
  }

  updateFollowing(input: { actor: string; uri: string; confirmed: boolean }) {
    this.db
      .prepare("UPDATE following SET confirmed = ? WHERE actor = ? AND uri = ?")
      .run(Number(input.confirmed), input.actor, input.uri);
  }

  deleteFollowing(input: { actor: string; uri: string }) {
    this.db
      .prepare("DELETE FROM following WHERE actor = ? AND uri = ?")
      .bind(input.actor, input.uri)
      .run();
  }
}
