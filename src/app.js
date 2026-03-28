import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import router from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.clientUrl
  })
);
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

export default app;
