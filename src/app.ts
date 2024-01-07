import express from "express";
import morgan from "morgan";
import http from "http";
import { ActivityPub } from "./activitypub.js";
import { Admin } from "./admin.js";
import { Db } from "./db.js";

export class ActivityPubApp {
  private readonly app = express();
  private readonly account: string;
  private readonly protocol: string;
  private readonly hostname: string;
  private readonly port: string;
  private readonly activitypub;
  private readonly admin;
  private server: http.Server;

  constructor(
    account: string,
    protocol: string,
    hostname: string,
    port: string,
    database: string,
    schema: string,
    publicKey: string | Buffer,
    privateKey: string | Buffer,
    username?: string,
    password?: string,
  ) {
    this.account = account;
    this.protocol = protocol;
    this.hostname = hostname;
    this.port = port;
    const db = new Db(database, schema);
    this.activitypub = new ActivityPub(
      db,
      account,
      hostname,
      publicKey,
      privateKey,
    );
    this.admin = new Admin(db, hostname, privateKey, username, password);

    this.server = this.app.listen(this.port, () => {
      console.log(`Dumbo listening on port ${this.port}…`);
    });
  }

  start(): void {
    this.app.set(
      "actor",
      `${this.protocol}://${this.hostname}/${this.account}`,
    );

    this.app.use(
      express.text({ type: ["application/json", "application/activity+json"] }),
    );

    this.app.use(morgan("tiny"));

    this.app.get("/.well-known/webfinger", async (req, res) => {
      const actor: string = req.app.get("actor");

      const resource = req.query.resource;
      if (resource !== `acct:${this.account}@${this.hostname}`)
        return res.sendStatus(404);

      return res.contentType("application/activity+json").json({
        subject: `acct:${this.account}@${this.hostname}`,
        links: [
          {
            rel: "self",
            type: "application/activity+json",
            href: actor,
          },
        ],
      });
    });

    this.app.use("/admin", this.admin.router()).use(this.activitypub.router());
  }

  stop() {
    this.server.close();
  }
}
