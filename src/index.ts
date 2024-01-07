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

const app = new ActivityPubApp(
  ACCOUNT,
  PROTOCOL,
  HOSTNAME,
  PORT,
  DATABASE_PATH,
  SCHEMA_PATH,
  PUBLIC_KEY,
  PRIVATE_KEY,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
);
app.start();
