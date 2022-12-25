import dotenv from "dotenv";
dotenv.config();

export const DATABASE_PATH = process.env.DATABASE_PATH || "";
export const HOSTNAME = process.env.HOSTNAME || "";
export const ACCOUNT = process.env.ACCOUNT || "";
export const PUBLIC_KEY = process.env.PUBLIC_KEY || "";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
