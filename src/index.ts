import crypto from "node:crypto";

import express from "express";

import {
  createFollower,
  deleteFollower,
  listFollowers,
  listPosts,
} from "./db.js";
import { HOSTNAME, ACCOUNT, PUBLIC_KEY } from "./env.js";
import { send, verify } from "./request.js";

const ACTOR = `https://${HOSTNAME}/${ACCOUNT}`;

const app = express();
const port = 3000;

app.use(
  express.text({ type: ["application/json", "application/activity+json"] })
);

app.use((req, res, next) => {
  const start = performance.now();
  next();
  const ms = Math.round(performance.now() - start);
  console.log(`${req.method} ${req.path} ${res.statusCode} - ${ms} ms`);
});

app.get("/.well-known/webfinger", async (req, res) => {
  const resource = req.query.resource;
  if (resource !== `acct:${ACCOUNT}@${HOSTNAME}`) return res.sendStatus(404);

  return res.contentType("application/activity+json").json({
    subject: `acct:${ACCOUNT}@${HOSTNAME}`,
    links: [{ rel: "self", type: "application/activity+json", href: ACTOR }],
  });
});

app.get("/:actor/outbox", async (req, res) => {
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

app.post("/:actor/inbox", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  // verify the signed HTTP request
  let from = "";
  try {
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

app.get("/:actor/followers", async (req, res) => {
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

app.get("/:actor/following", async (req, res) => {
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

app.get("/:actor", async (req, res) => {
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

app.listen(port, () => {
  console.log(`Dumbo listening on port ${port}…`);
});
