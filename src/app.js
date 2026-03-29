import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { httpError } from "./utils/httpError.js";

const app = express();
const defaultAllowedOrigins = [
  "http://localhost:443",
  "http://localhost:5173",
  "https://ba-workcenter.vercel.app",
  "https://ba-workcenter-*.vercel.app",
  "https://ba-workcenter-git-*.vercel.app"
];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...env.clientUrls])];

function isAllowedOrigin(origin) {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.includes("*")) {
      const pattern = new RegExp(
        `^${allowedOrigin
          .split("*")
          .map((segment) =>
            segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          )
          .join(".*")}$`,
      );
      return pattern.test(origin);
    }

    return allowedOrigin === origin;
  });
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(
      httpError(403, `Origin ${origin} is not allowed by CORS`)
    );
  },
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export default app;
