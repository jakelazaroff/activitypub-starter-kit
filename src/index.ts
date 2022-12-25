import express from "express";

import { listPosts } from "./db";
import { HOSTNAME, ACCOUNT, PUBLIC_KEY } from "./env";

const ACTOR = `https://${HOSTNAME}/${ACCOUNT}`;

const app = express();
const port = 3000;

app.get("/.well-known/webfinger", async (req, res) => {
  const resource = req.query.resource;
  if (resource !== `acct:${ACCOUNT}@${HOSTNAME}`) return res.sendStatus(404);

  return res.json({
    subject: `acct:${ACCOUNT}@${HOSTNAME}`,
    links: [{ rel: "self", type: "application/activity+json", href: ACTOR }],
  });
});

app.get("/:actor/outbox", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  const posts = listPosts();

  return res.json({
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

app.get("/:actor/inbox", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  return res.json({
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

app.get("/:actor", async (req, res) => {
  if (req.params.actor !== ACCOUNT) return res.sendStatus(404);

  return res.json({
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
