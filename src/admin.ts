import crypto from "node:crypto";

import { is, omit, type } from "superstruct";
import { Router } from "express";
import basicAuth from "express-basic-auth";

import { Db } from "./db.js";
import { send } from "./request.js";
import { Object } from "./types.js";

export class Admin {
  private readonly db: Db;
  private readonly admin = Router();
  private readonly hostname: string;
  private readonly privateKey: string | Buffer;

  constructor(
    db: Db,
    hostname: string,
    privateKey: string | Buffer,
    username?: string,
    password?: string,
  ) {
    this.db = db;
    this.hostname = hostname;
    this.privateKey = privateKey;

    if (username && password) {
      this.admin.use(basicAuth({ users: { [username]: password } }));
    }
  }

  router() {
    this.admin.post("/create", async (req, res) => {
      const actor: string = req.app.get("actor");

      const create = type({ object: omit(Object, ["id"]) });

      const body = JSON.parse(req.body);
      if (!is(body, create)) return res.sendStatus(400);

      const date = new Date();

      const object = this.db.createPost({
        attributedTo: actor,
        published: date.toISOString(),
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [`${actor}/followers`],
        ...body.object,
      });

      const activity = this.db.createPost({
        "@context": "https://www.w3.org/ns/activitystreams",
        type: "Create",
        published: date.toISOString(),
        actor,
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [`${actor}/followers`],
        ...body,
        object: { ...object.contents, id: `${actor}/post/${object.id}` },
      });

      for (const follower of this.db.listFollowers()) {
        send(
          actor,
          follower.actor,
          {
            ...activity.contents,
            id: `${actor}/post/${activity.id}`,
            cc: [follower.actor],
          },
          this.privateKey,
        );
      }

      return res.send(JSON.stringify(activity));
    });

    this.admin.post("/follow/:actor", async (req, res) => {
      const actor: string = req.app.get("actor");

      const object = req.params.actor;
      const uri = `https://${this.hostname}/@${crypto.randomUUID()}`;
      await send(
        actor,
        object,
        {
          "@context": "https://www.w3.org/ns/activitystreams",
          id: uri,
          type: "Follow",
          actor,
          object,
        },
        this.privateKey,
      );

      this.db.createFollowing({ actor: object, uri });
      res.sendStatus(204);
    });

    this.admin.delete("/follow/:actor", async (req, res) => {
      const actor: string = req.app.get("actor");

      const object = req.params.actor;
      const following = this.db.getFollowing(object);
      if (!following) return res.sendStatus(204);

      await send(
        actor,
        object,
        {
          "@context": "https://www.w3.org/ns/activitystreams",
          id: following.uri + "/undo",
          type: "Undo",
          actor: actor,
          object: {
            id: following.uri,
            type: "Follow",
            actor,
            object,
          },
        },
        this.privateKey,
      );

      this.db.deleteFollowing({ actor: object, uri: following.uri });
      return res.sendStatus(204);
    });

    return this.admin;
  }
}
