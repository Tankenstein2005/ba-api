import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const poolConfig = env.databaseUrl
  ? {
      uri: env.databaseUrl
    }
  : {
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName
    };

export const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 10
});
