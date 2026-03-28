import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:443",
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "BrokenArrowDB",
  profileName: process.env.PROFILE_NAME || "Broken Arrow Studio",
  profileTagline:
    process.env.PROFILE_TAGLINE ||
    "Design sessions, discovery calls, and project check-ins.",
  defaultTimezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata"
};
