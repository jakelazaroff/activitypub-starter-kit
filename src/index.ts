import { ActivityPubApp } from "./app.js";

import {
  ACCOUNT,
  HOSTNAME,
  PORT,
  PROTOCOL,
  DATABASE_PATH,
  SCHEMA_PATH,
  PUBLIC_KEY,
  PRIVATE_KEY,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
} from "./env.js";

const app = new ActivityPubApp({
  account: ACCOUNT,
  protocol: PROTOCOL,
  host: HOSTNAME,
  port: PORT,
  database: DATABASE_PATH,
  schema: SCHEMA_PATH,
  publicKey: PUBLIC_KEY,
  privateKey: PRIVATE_KEY,
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD,
});
app.start();
