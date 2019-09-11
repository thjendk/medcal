import express from "express";
import Event from "models/eventsModel";
import { populateEvents } from "jobs/populateEvents";
const Router = express.Router();

Router.get("/events", async (req, res) => {
  const { y: year, s: season, sem: semester } = req.params;

  return Event.query().where({ year, season, semester });
});

Router.get("/populate", async (req, res) => {
  populateEvents();

  res.status(200).send("Running population");
});

export default Router;
