import express from "express";
import Event from "models/events.model";
import moment from "moment-timezone";

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
      id,
      future,
      lecture,
      today
    } = req.query;

    // Start query
    let resultQuery = Event.query().joinEager(Event.defaultEager);

    // Hvis et ID gives, så returneres blot dette event.
    if (id) {
      const result = await resultQuery.findById(id);
      return res.status(200).json(result);
    }

    // Simple query defines her (hvis det er undefined, bliver de ikke talt med)
    resultQuery = resultQuery
      .where({
        "events.year": year,
        "events.season": season,
        "events.semester": semester,
        type: type
      })
      .where(function() {
        this.where({ "teams.team": team })
          .orWhere({ "otherTeams.team": team })
          .skipUndefined();
      })
      .skipUndefined();

    if (lecture) {
      resultQuery = resultQuery.whereNotNull("events.lectureId");
    }

    if (sortBy || sortby) {
      resultQuery = resultQuery.orderBy(sortBy || sortby, order || "asc");
    } else {
      resultQuery = resultQuery.orderBy("start");
    }

    if (future) {
      resultQuery = resultQuery.where(
        "start",
        ">",
        moment.tz(new Date(), "Europe/Copenhagen").toISOString()
      );
    }

    if (today) {
      resultQuery = resultQuery
        .where(
          "start",
          ">",
          moment
            .tz(new Date(), "Europe/Copenhagen")
            .startOf("day")
            .toISOString()
        )
        .andWhere(
          "end",
          "<",
          moment
            .tz(new Date(), "Europe/Copenhagen")
            .endOf("day")
            .toISOString()
        );
    }

    // Hent events
    let events: Partial<Event>[] = await resultQuery;

    events = events.map(event => Event.reWriteTeams(event));
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(404).send(error);
  }
});

export default Router;
