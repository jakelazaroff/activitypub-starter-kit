import crypto from "node:crypto";

import { is, omit, type } from "superstruct";
import { Router } from "express";
import basicAuth from "express-basic-auth";

import { ADMIN_PASSWORD, ADMIN_USERNAME, HOSTNAME } from "./env.js";
import {
  createFollowing,
  createPost,
  deleteFollowing,
  getFollowing,
  listFollowers,
} from "./db.js";
import { send } from "./request.js";
import { Object } from "./types.js";

export const admin = Router();

if (ADMIN_USERNAME && ADMIN_PASSWORD) {
  admin.use(basicAuth({ users: { [ADMIN_USERNAME]: ADMIN_PASSWORD } }));
}

admin.post("/create", async (req, res) => {
  const actor: string = req.app.get("actor");

  const create = type({ object: omit(Object, ["id"]) });

  const body = JSON.parse(req.body);
  if (!is(body, create)) return res.sendStatus(400);

  const date = new Date();

  const object = createPost({
    attributedTo: actor,
    published: date.toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${actor}/followers`],
    ...body.object,
  });

  const activity = createPost({
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Create",
    published: date.toISOString(),
    actor,
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${actor}/followers`],
    ...body,
    object: { ...object.contents, id: `${actor}/post/${object.id}` },
  });

  for (const follower of listFollowers()) {
    send(actor, follower.actor, {
      ...activity.contents,
      id: `${actor}/post/${activity.id}`,
      cc: [follower.actor],
    });
  }

  return res.sendStatus(204);
});

admin.post("/follow/:actor", async (req, res) => {
  const actor: string = req.app.get("actor");

  const object = req.params.actor;
  const uri = `https://${HOSTNAME}/@${crypto.randomUUID()}`;
  await send(actor, object, {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: uri,
    type: "Follow",
    actor,
    object,
  });

  createFollowing({ actor: object, uri });
  res.sendStatus(204);
});

admin.delete("/follow/:actor", async (req, res) => {
  const actor: string = req.app.get("actor");

  const object = req.params.actor;
  const following = getFollowing(object);
  if (!following) return res.sendStatus(204);

  await send(actor, object, {
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
  });

  deleteFollowing({ actor: object, uri: following.uri });
  return res.sendStatus(204);
});
