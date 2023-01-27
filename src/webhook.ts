import { is, omit, type } from "superstruct";
import { Router } from "express";

import { WEBHOOK_PATH } from "./env.js";
import {
  createPost,
  listFollowers,
} from "./db.js";
import { send } from "./request.js";
import { Object } from "./types.js";

export const webhook = Router();


webhook.post(`/${WEBHOOK_PATH}`, async (req, res) => {
  const actor: string = req.app.get("actor");

  const create = type({ object: omit(Object, ["id"]) });

  const body = {"object": {"type": "Note", "mediaType": "application/json", "content": req.body}};
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
