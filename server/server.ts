import express from "express";
import dotEnv from "dotenv-flow";
import events from "routes/events";
import teachers from "routes/teachers";
import populateEventsCron, { populateEvents } from "jobs/populateEvents";
dotEnv.config({ node_env: process.env.NODE_ENV || "development" });
import "config/objection";
import moment from "moment-timezone";
const app = express();
const port = process.env.PORT || 3001;
moment.tz.setDefault("Europe/Copenhagen");

populateEventsCron.start();

app.use("/events", events);
app.use("/teachers", teachers);

app.get("/populate", async (req, res) => {
  populateEvents();

  res.status(200).send("Running population");
});

app.get("/", (req, res) => {
  res
    .status(200)
    .send("Velkommen til medcal. Vi er klar til at modtage queries.");
});

app.listen(port, () => console.log(`Running on http://localhost:${port}`));
