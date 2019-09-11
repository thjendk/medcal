import express from "express";
import Event from "models/eventsModel";
import { populateEvents } from "jobs/populateEvents";
const Router = express.Router();

Router.get("/events", async (req, res) => {
  const { y: year, s: season, sem: semester } = req.query;

  const result = await Event.query()
    .joinEager("[teams, teachers]")
    .where({ year, "events.season": season, "events.semester": semester })
    .skipUndefined();

  res.status(200).json(result);
});

Router.get("/populate", async (req, res) => {
  populateEvents();

  res.status(200).send("Running population");
});

export default Router;
