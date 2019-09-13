import express from "express";
import Event from "models/eventsModel";
import moment from "moment";
import OtherEventsTeams from "models/otherEventsTeams";
const Router = express.Router();

Router.get("/", async (req, res) => {
  try {
    let {
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
      id,
      whereEndBetween,
      nextEvent
    } = req.query;

    let resultQuery = Event.query().joinEager("[teams, teachers, otherTeams]");

    if (start) start = moment(start).format("YYYY-MM-DD HH:mm:ss");
    if (end) end = moment(end).format("YYYY-MM-DD HH:mm:ss");

    if (id) {
      const result = await resultQuery.findById(id);
      return res.status(200).json(result);
    }

    resultQuery = resultQuery
      .where({
        "events.year": year,
        "events.season": season,
        "events.semester": semester,
        type: type,
        "teams.team": team
      })
      .skipUndefined();

    if (nextEvent) {
      if (!start || !end || !team || !semester)
        return res
          .status(400)
          .send(
            "You must specify semester, team, start and end, when getting next event"
          );
      const event = await resultQuery
        .andWhere(function() {
          this.whereBetween("end", [start, end]).orWhere("end", ">=", start);
        })
        .orderBy("start", "asc")
        .first();
      if (!event)
        return res.status(400).send("NextEvent not found or something?");

      if (event && event.teams.length < 1) {
        event.teams = event.otherTeams;
      }

      delete event.otherTeams;
      return res.status(200).json(event);
    }

    if (whereEndBetween && start && end) {
      resultQuery = resultQuery.whereBetween("end", [start, end]);
    }
    if (start && !whereEndBetween) {
      resultQuery = resultQuery.where("start", ">=", start);
    }
    if (end && !whereEndBetween) {
      resultQuery = resultQuery.where("end", "<=", end);
    }

    if (sortBy || sortby) {
      resultQuery = resultQuery.orderBy(sortBy || sortby, order || "asc");
    } else {
      resultQuery = resultQuery.orderBy("start");
    }

    // Grim kode der lige skal laves for at få teams til at fungere. SKAL RYDDES OP!
    let events: Partial<Event>[] = await resultQuery;
    events = events.map(result => {
      if (!result.teams || result.teams.length < 1) {
        const newObject = { ...result, teams: result.otherTeams };
        delete result.otherTeams;
        return newObject;
      } else {
        delete result.otherTeams;
        return result;
      }
    });

    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(404).send(error);
  }
});

export default Router;
