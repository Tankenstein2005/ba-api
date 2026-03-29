import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

function isAllowedOrigin(origin) {
  return env.clientUrls.some((allowedOrigin) => {
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

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    }
  })
);
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export default app;
