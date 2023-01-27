import express from "express";
import morgan from "morgan";

import { ACCOUNT, HOSTNAME, PORT, PROTO, FDQN } from "./env.js";
import { activitypub } from "./activitypub.js";
import { admin } from "./admin.js";
import { webhook } from "./webhook.js";

const app = express();

const endpoint: string = (FDQN != null ? FDQN: `${HOSTNAME}:${PORT}`);

app.set("actor", `${PROTO}://${endpoint}/${ACCOUNT}`);

app.use(
  express.text({ type: ["application/json", "application/activity+json"] })
);

app.use(morgan("tiny"));

app.get("/.well-known/webfinger", async (req, res) => {
  const actor: string = req.app.get("actor");

  const resource = req.query.resource;
  if (resource !== `acct:${ACCOUNT}@${endpoint}`) return res.sendStatus(404);

  return res.contentType("application/activity+json").json({
    subject: `acct:${ACCOUNT}@${endpoint}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: actor,
      },
    ],
  });
});

app.use("/admin", admin).use(activitypub);
app.use("/webhook", webhook);

app.listen(PORT, () => {
  console.log(`Dumbo listening on port ${PORT}…`);
});
