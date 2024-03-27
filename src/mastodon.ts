import { Router } from "express";

import { Db } from "./db.js";

export class Mastodon {

  private readonly db: Db;
  private readonly account: string;
  private readonly routes = Router();

  constructor(db: Db, account: string) {
    this.db = db;
    this.account = account;
  }

  router(): Router {
    this.routes.get("/accounts/:actor/statuses", async (req, res) => {
      if (req.params.actor !== this.account) return res.sendStatus(404);

      const posts = this.db
        .listPosts()
        .filter(
          (post) => "type" in post.contents && post.contents.type === "Create",
        );

      const json =
        posts.map((post) => {
          const { object } = post.contents as { object: any };

          return Object.assign(object, {
            id: getRawId(object.id),
            created_at: post.createdAt.toISOString(),
            in_reply_to_id: object.in_reply_to_id ? getRawId(object.in_reply_to_id) : undefined,
            account: {
              id: this.account
            }
          })
        });

      return res.contentType("application/json").json(json);
    });

    return this.routes;
  }

}

function getRawId(id: string): string {
  const url = new URL(id);

  return url
    .pathname
    .split('/')
    .slice(-1)[0] as string;
}
