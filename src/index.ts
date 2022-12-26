import express from "express";

import { HOSTNAME, ACCOUNT } from "./env.js";
import { activitypub } from "./activitypub.js";

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
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: `https://${HOSTNAME}/@${ACCOUNT}`,
      },
    ],
  });
});

app.use(activitypub);

app.listen(port, () => {
  console.log(`Dumbo listening on port ${port}…`);
});
