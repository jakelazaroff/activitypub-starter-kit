import crypto from "node:crypto";

import { Router } from "express";

import { Db } from "./db.js";
import { send, verify } from "./request.js";

export class ActivityPub {
  private readonly db: Db;
  private readonly account: string;
  private readonly hostname: string;
  private readonly publicKey: string | Buffer;
  private readonly privateKey: string | Buffer;

  constructor(
    db: Db,
    account: string,
    hostname: string,
    publicKey: string | Buffer,
    privateKey: string | Buffer,
  ) {
    this.db = db;
    this.account = account;
    this.hostname = hostname;
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  router() {
    const activitypub = Router();

    activitypub.get("/:actor/outbox", async (req, res) => {
      const actor: string = req.app.get("actor");
      if (req.params.actor !== this.account) return res.sendStatus(404);

      const posts = this.db
        .listPosts()
        .filter(
          (post) => "type" in post.contents && post.contents.type === "Create",
        );

      return res.contentType("application/activity+json").json({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${actor}/outbox`,
        type: "OrderedCollection",
        totalItems: posts.length,
        orderedItems: posts.map((post) => ({
          ...post.contents,
          id: `${actor}/posts/${post.id}`,
          actor,
          published: post.createdAt.toISOString(),
          to: ["https://www.w3.org/ns/activitystreams#Public"],
          cc: [],
        })),
      });
    });

    activitypub.post("/:actor/inbox", async (req, res) => {
      const actor: string = req.app.get("actor");
      if (req.params.actor !== this.account) return res.sendStatus(404);

      /** If the request successfully verifies against the public key, `from` is the actor who sent it. */
      let from = "";
      try {
        // verify the signed HTTP request
        from = await verify(req);
      } catch (err) {
        console.error(err);
        return res.sendStatus(401);
      }

      const body = JSON.parse(req.body);

      // ensure that the verified actor matches the actor in the request body
      if (from !== body.actor) return res.sendStatus(401);

      switch (body.type) {
        case "Follow": {
          await send(
            actor,
            body.actor,
            {
              "@context": "https://www.w3.org/ns/activitystreams",
              id: `https://${this.hostname}/${crypto.randomUUID()}`,
              type: "Accept",
              actor,
              object: body,
            },
            this.privateKey,
          );

          this.db.createFollower({ actor: body.actor, uri: body.id });
          break;
        }

        case "Undo": {
          if (body.object.type === "Follow") {
            this.db.deleteFollower({ actor: body.actor, uri: body.object.id });
          }

          break;
        }

        case "Accept": {
          if (body.object.type === "Follow") {
            this.db.updateFollowing({
              actor: body.actor,
              uri: body.object.id,
              confirmed: true,
            });
          }

          break;
        }
      }

      return res.sendStatus(204);
    });

    activitypub.get("/:actor/followers", async (req, res) => {
      const actor: string = req.app.get("actor");

      if (req.params.actor !== this.account) return res.sendStatus(404);
      const page = req.query.page;

      const followers = this.db.listFollowers();

      res.contentType("application/activity+json");

      if (!page) {
        return res.json({
          "@context": "https://www.w3.org/ns/activitystreams",
          id: `${actor}/followers`,
          type: "OrderedCollection",
          totalItems: followers.length,
          first: `${actor}/followers?page=1`,
        });
      }

      return res.json({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${actor}/followers?page=${page}`,
        type: "OrderedCollectionPage",
        partOf: `${actor}/followers`,
        totalItems: followers.length,
        orderedItems: followers.map((follower) => follower.actor),
      });
    });

    activitypub.get("/:actor/following", async (req, res) => {
      const actor: string = req.app.get("actor");

      if (req.params.actor !== this.account) return res.sendStatus(404);
      const page = req.query.page;

      const following = this.db.listFollowing();

      res.contentType("application/activity+json");

      if (!page) {
        return res.json({
          "@context": "https://www.w3.org/ns/activitystreams",
          id: `${actor}/following`,
          type: "OrderedCollection",
          totalItems: following.length,
          first: `${actor}/following?page=1`,
        });
      }

      return res.json({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `${actor}/following?page=${page}`,
        type: "OrderedCollectionPage",
        partOf: `${actor}/following`,
        totalItems: following.length,
        orderedItems: following.map((follow) => follow.actor),
      });
    });

    activitypub.get("/:actor", async (req, res) => {
      const actor: string = req.app.get("actor");

      if (req.params.actor !== this.account) return res.sendStatus(404);

      return res.contentType("application/activity+json").json({
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: actor,
        type: "Person",
        preferredUsername: this.account,
        inbox: `${actor}/inbox`,
        outbox: `${actor}/outbox`,
        followers: `${actor}/followers`,
        following: `${actor}/following`,
        publicKey: {
          id: `${actor}#main-key`,
          owner: actor,
          publicKeyPem: this.publicKey,
        },
      });
    });

    activitypub.get("/api/v1/accounts/:actor", async (req, res) => {
      const actor: string = req.app.get("actor");

      if (req.params.actor !== this.account) return res.sendStatus(404);

      return res.contentType("application/activity+json").json({
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: actor,
        type: "Person",
        preferredUsername: this.account,
        inbox: `${actor}/inbox`,
        outbox: `${actor}/outbox`,
        followers: `${actor}/followers`,
        following: `${actor}/following`,
        publicKey: {
          id: `${actor}#main-key`,
          owner: actor,
          publicKeyPem: this.publicKey,
        },
      });
    });

    activitypub.get("/:actor/posts/:id", async (req, res) => {
      const actor: string = req.app.get("actor");
      if (req.params.actor !== this.account) return res.sendStatus(404);

      const post = this.db.findPost(req.params.id);
      if (!post) return res.sendStatus(404);

      return res.contentType("application/activity+json").json({
        ...post,
        id: `${actor}/posts/${req.params.id}`,
      });
    });

    return activitypub;
  }
}
