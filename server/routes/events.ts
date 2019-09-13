import express from "express";
import Event from "models/eventsModel";
import { populateEvents } from "jobs/populateEvents";
const Router = express.Router();

Router.get("/events", async (req, res) => {
  const {
    year,
    season,
    semester,
    team,
    sortby,
    sortBy,
    type,
    order,
    start,
    end,
    id
  } = req.query;

  if (id) {
    const result = await Event.query().findById(id);
    return res.status(200).send(result);
  }

  let resultQuery = Event.query()
    .joinEager("[teams, teachers]")
    .where({
      year,
      "events.season": season,
      "events.semester": semester,
      type: type,
      "events.team": team
    })
    .skipUndefined();

  if (start) {
    resultQuery = resultQuery.where("start", ">=", start);
  }
  if (end) {
    resultQuery = resultQuery.where("end", "<=", end);
  }
  if (sortBy || sortby) {
    resultQuery = resultQuery.orderBy(sortBy || sortby, order || "asc");
  } else {
    resultQuery = resultQuery.orderBy("start");
  }

  const result = await resultQuery;

  res.status(200).json(result);
});

Router.get("/populate", async (req, res) => {
  populateEvents();

  res.status(200).send("Running population");
});

export default Router;
