import dotenv from "dotenv";

dotenv.config();

function normalizeUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

function inferPublicClientUrl(clientUrl, clientUrls) {
  const normalizedClientUrl = clientUrl ? normalizeUrl(clientUrl) : "";

  if (
    normalizedClientUrl &&
    !normalizedClientUrl.includes("localhost") &&
    !normalizedClientUrl.includes("*")
  ) {
    return normalizedClientUrl;
  }

  const fallbackUrl = clientUrls.find((value) => {
    return (
      value.startsWith("https://") &&
      !value.includes("localhost") &&
      !value.includes("*")
    );
  });

  return fallbackUrl ? normalizeUrl(fallbackUrl) : "";
}

const configuredClientUrl = process.env.CLIENT_URL || "http://localhost:443";
const configuredClientUrls = (
  process.env.CLIENT_URLS ||
  configuredClientUrl ||
  "http://localhost:443"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const configuredStorageMode = process.env.STORAGE_MODE?.trim().toLowerCase();
const storageMode =
  process.env.FORCE_DEMO_DATA === "true"
    ? "demo"
    : ["auto", "database", "demo"].includes(configuredStorageMode)
      ? configuredStorageMode
      : "auto";

export const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: configuredClientUrl,
  clientUrls: configuredClientUrls,
  publicClientUrl: inferPublicClientUrl(
    configuredClientUrl,
    configuredClientUrls
  ),
  databaseUrl: process.env.DATABASE_URL || "",
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "",
  dbName: process.env.DB_NAME || "BrokenArrowDB",
  forceDemoData: process.env.FORCE_DEMO_DATA === "true",
  storageMode,
  profileName: process.env.PROFILE_NAME || "Broken Arrow Studio",
  profileTagline:
    process.env.PROFILE_TAGLINE ||
    "Design sessions, discovery calls, and project check-ins.",
  defaultTimezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata"
};
