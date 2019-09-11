import express from "express";
import dotEnv from "dotenv-flow";
import events from "routes/events";
import populateEventsCron from "jobs/populateEvents";
dotEnv.config({ node_env: process.env.NODE_ENV || "development" });
import "config/objection";
const app = express();
const port = process.env.PORT || 3001;

populateEventsCron.start();

app.use("/", events);

app.listen(port, () => console.log(`Listening on port ${port}`));
