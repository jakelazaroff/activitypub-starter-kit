import Database from "better-sqlite3";

import { DATABASE_PATH } from "./env";

const db = new Database(DATABASE_PATH);

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
