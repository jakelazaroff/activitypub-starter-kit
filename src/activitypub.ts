import crypto from "node:crypto";

import { Router } from "express";

import {
  createFollower,
  deleteFollower,
  listFollowers,
  listPosts,
} from "./db.js";
import { HOSTNAME, ACCOUNT, PUBLIC_KEY } from "./env.js";
import { send, verify } from "./request.js";

const ACTOR = `https://${HOSTNAME}/@${ACCOUNT}`;

export const activitypub = Router();

activitypub.get("/@:actor/outbox", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  const posts = listPosts();

  return res.contentType("application/activity+json").json({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${ACTOR}/outbox`,
    type: "OrderedCollection",
    totalItems: posts.length,
    orderedItems: posts.map((post) => ({
      ...post.contents,
      id: post.uri,
      type: post.type,
      actor: ACTOR,
      published: post.createdAt.toISOString(),
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [],
    })),
  });
});

activitypub.post("/@:actor/inbox", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

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

  // check that the request is for the correct account
  const [, name = ""] = req.path.match(/^\/(.*?)(\/.*)?$/) || [];
  if (name !== ACCOUNT) return res.sendStatus(404);

  switch (body.type) {
    case "Follow": {
      await send(ACTOR, body.actor, {
        "@context": "https://www.w3.org/ns/activitystreams",
        id: `https://${HOSTNAME}/${crypto.randomUUID()}`,
        type: "Accept",
        actor: ACTOR,
        object: body,
      });

      createFollower({ actor: body.actor, uri: body.id });
      break;
    }

    case "Undo": {
      deleteFollower({ actor: body.actor, uri: body.object.id });
      break;
    }
  }

  return res.sendStatus(204);
});

activitypub.get("/@:actor/followers", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);
  const page = req.query.page;

  const followers = listFollowers();

  res.contentType("application/activity+json");

  if (!page) {
    return res.json({
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${ACTOR}/followers`,
      type: "OrderedCollection",
      totalItems: followers.length,
      first: `${ACTOR}/followers?page=1`,
    });
  }

  return res.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${ACTOR}/followers?page=${page}`,
    type: "OrderedCollectionPage",
    partOf: `${ACTOR}/followers`,
    totalItems: followers.length,
    orderedItems: followers.map((follower) => follower.actor),
  });
});

activitypub.get("/@:actor/following", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);
  const page = req.query.page;

  res.contentType("application/activity+json");

  if (!page) {
    return res.json({
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${ACTOR}/following`,
      type: "OrderedCollection",
      totalItems: 0,
      first: `${ACTOR}/following?page=1`,
    });
  }

  return res.json({
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${ACTOR}/following?page=${page}`,
    type: "OrderedCollectionPage",
    partOf: `${ACTOR}/following`,
    totalItems: 0,
    orderedItems: [],
  });
});

activitypub.get("/@:actor", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  return res.contentType("application/activity+json").json({
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    id: ACTOR,
    type: "Person",
    preferredUsername: ACCOUNT,
    inbox: `${ACTOR}/inbox`,
    outbox: `${ACTOR}/outbox`,
    followers: `${ACTOR}/followers`,
    following: `${ACTOR}/following`,
    publicKey: {
      id: `${ACTOR}#main-key`,
      owner: ACTOR,
      publicKeyPem: PUBLIC_KEY,
    },
  });
});
