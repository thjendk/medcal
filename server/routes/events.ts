import express from "express";
import Event from "models/eventsModel";
import { populateEvents } from "jobs/populateEvents";
const Router = express.Router();

Router.get("/events", async (req, res) => {
  const {
    y: year,
    s: season,
    sem: semester,
    team,
    sortby,
    sortBy,
    type,
    order,
    start,
    end
  } = req.query;

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
  if (sortBy === "updated_at" || sortby === "updated_at") {
    resultQuery = resultQuery.orderBy("updated_at", order || "desc");
  } else if (sortBy === "lecture_id" || sortby === "lecture_id") {
    resultQuery = resultQuery
      .whereNotNull("events.lecture_id")
      .orderBy("events.lecture_id", order || "asc");
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
