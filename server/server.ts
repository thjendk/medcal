import express from "express";
import dotEnv from "dotenv-flow";
import events from "routes/events";
import teachers from "routes/teachers";
import medeval from "routes/medeval";
import populateEventsCron, { populateEvents } from "jobs/populateEvents";
dotEnv.config({ node_env: process.env.NODE_ENV || "development" });
import "config/objection";
const app = express();
const port = process.env.PORT || 3001;

populateEventsCron.start();

app.use("/events", events);
app.use("/teachers", teachers);
app.use("/medeval", medeval);

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
