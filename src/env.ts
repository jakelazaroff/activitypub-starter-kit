import crypto from "node:crypto";

import dotenv from "dotenv";

dotenv.config();

export const PORT = parseInt(process.env.PORT || "3000");

export const ACCOUNT = process.env.ACCOUNT || "";
export const PROTOCOL = process.env.PROTOCOL || "https";
export const HOSTNAME = process.env.HOSTNAME || "";

export const DATABASE_PATH = process.env.DATABASE_PATH || "";
export const SCHEMA_PATH = process.env.SCHEMA_PATH || "";

// in development, generate a key pair to make it easier to get started
const keypair =
  process.env.NODE_ENV === "development"
    ? crypto.generateKeyPairSync("rsa", { modulusLength: 4096 })
    : undefined;

export const PUBLIC_KEY =
  process.env.PUBLIC_KEY ||
  keypair?.publicKey.export({ type: "spki", format: "pem" }) ||
  "";
export const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  keypair?.privateKey.export({ type: "pkcs8", format: "pem" }) ||
  "";

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
