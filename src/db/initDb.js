import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { env } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  const schemaPath = path.resolve(__dirname, "../../sql/schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  const connection = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    multipleStatements: true
  });

  try {
    await connection.query(schema);
    console.log("Database initialized.");
  } finally {
    await connection.end();
  }
}

initDb().catch((error) => {
  console.error(error);
  process.exit(1);
});
