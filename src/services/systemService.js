import { env } from "../config/env.js";
import { pool } from "../db/pool.js";

function isDatabaseConfigured() {
  return Boolean(env.databaseUrl || (env.dbHost && env.dbUser && env.dbName));
}

async function isDatabaseReachable() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function getSystemStatus() {
  const configured = isDatabaseConfigured();
  const reachable =
    env.storageMode === "demo" || !configured ? false : await isDatabaseReachable();
  const fallbackActive = env.storageMode === "auto" && configured && !reachable;
  const activeStorage =
    env.storageMode === "demo" || fallbackActive ? "demo" : "database";

  return {
    ok: true,
    storage: {
      configuredMode: env.storageMode,
      activeMode: activeStorage,
      fallbackActive
    },
    database: {
      configured,
      reachable
    }
  };
}
