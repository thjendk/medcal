import express from "express";
import moment from "moment-timezone";
import Event from "models/eventsModel";
const router = express.Router();

router.get("/nextevent/:semester/:team", async (req, res) => {
  const { team, semester } = req.params;

  const start = moment(new Date())
    .tz("Europe/Copenhagen")
    .subtract(15, "minutes")
    .toISOString();
  const end = moment(new Date())
    .tz("Europe/Copenhagen")
    .add(15, "minutes")
    .toISOString();

  try {
    let result = await Event.query()
      .joinEager(Event.defaultEager)
      .where("events.semester", "=", semester)
      .andWhere(function() {
        this.where("teams.team", "=", team).orWhere(
          "otherTeams.team",
          "=",
          team
        );
      })
      .andWhere(function() {
        this.whereBetween("end", [start, end]).orWhere("end", ">=", start);
      })
      .orderBy("start", "asc")
      .first();
    if (!result) return res.status(404).send("No event found");

    result = Event.reWriteTeams(result);

    res.status(200).send(result);
  } catch (err) {
    throw new Error(err);
  }
});

router.get("/today/:semester/:team", async (req, res) => {
  const { team, semester } = req.params;
  const { date } = req.query;
  const now = date || new Date();

  const today = moment(now)
    .tz("Europe/Copenhagen")
    .startOf("day")
    .toISOString();
  const tomorrow = moment(now)
    .tz("Europe/Copenhagen")
    .endOf("day")
    .toISOString();

  try {
    let results = await Event.query()
      .joinEager(Event.defaultEager)
      .where("events.semester", "=", semester)
      .andWhere(function() {
        this.where("teams.team", "=", team).orWhere(
          "otherTeams.team",
          "=",
          team
        );
      })
      .andWhere("start", ">=", today)
      .andWhere("start", "<=", tomorrow)
      .orderBy("start", "asc");

    results = results.map(result => Event.reWriteTeams(result));

    res.status(200).send(results);
  } catch (err) {
    throw new Error(err);
  }
});

router.get("/notifications", async (req, res) => {
  const start = moment(new Date())
    .tz("Europe/Copenhagen")
    .subtract(15, "minutes")
    .toISOString();
  const end = moment(new Date())
    .tz("Europe/Copenhagen")
    .add(15, "minutes")
    .toISOString();

  let events = await Event.query().whereBetween("end", [start, end]);

  events = events.map(event => Event.reWriteTeams(event));

  res.status(200).send(events);
});

export default router;
