import express from "express";
import morgan from "morgan";
import http from "http";
import { ActivityPub } from "./activitypub.js";
import { Admin } from "./admin.js";
import { Db } from "./db.js";
import { Mastodon } from "./mastodon.js";

interface ActivityPubAppConfig {
  account: string;
  protocol: string;
  host: string;
  port: number;
  database: string;
  schema: string;
  publicKey?: string | Buffer;
  privateKey?: string | Buffer;
  username?: string;
  password?: string;
}

export class ActivityPubApp {
  private readonly app = express();
  private readonly activitypub;
  private readonly admin;
  private readonly mastodon;
  private server: http.Server;

  readonly account: string;
  readonly protocol: string;
  readonly host: string;
  readonly port: number;

  constructor(config: ActivityPubAppConfig) {
    this.account = config.account;
    this.protocol = config.protocol;
    this.host = config.host;
    this.port = config.port;
    const db = new Db(config.database, config.schema);
    this.activitypub = new ActivityPub(
      db,
      config.account,
      config.host,
      config.publicKey || "",
      config.privateKey || "",
    );
    this.admin = new Admin(
      db,
      config.host,
      config.privateKey || "",
      config.username,
      config.password,
    );
    this.mastodon = new Mastodon(db, config.account)

    this.server = this.app.listen(this.port, () => {
      console.log(`Dumbo listening on port ${this.port}…`);
    });
  }

  start(): void {
    this.app.set("actor", `${this.protocol}://${this.host}/${this.account}`);

    this.app.use(
      express.text({ type: ["application/json", "application/activity+json"] }),
    );

    this.app.use(morgan("tiny"));

    this.app.get("/.well-known/webfinger", async (req, res) => {
      const actor: string = req.app.get("actor");

      const resource = req.query.resource;
      if (resource !== `acct:${this.account}@${this.host}`)
        return res.sendStatus(404);

      return res.contentType("application/activity+json").json({
        subject: `acct:${this.account}@${this.host}`,
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
    this.app.use("/api/v1", this.mastodon.router()).use(this.activitypub.router());
  }

  stop() {
    this.server.close();
  }

  static testApp(): ActivityPubApp {
    const config = {
      account: "test",
      protocol: "http",
      host: "localhost:3000",
      port: 3000,
      database: "./database.sqlite3",
      schema: "./node_modules/activitypub-starter-kit.rg-wood/db/schema.sql",
    };

    return new ActivityPubApp(config);
  }
}
