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
      locationId,
      place,
      date,
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
        type,
        locationId,
        place
      })
      .where(function() {
        this.where({ "teams.team": team }).skipUndefined();
      })
      .skipUndefined();

    if (sortBy || sortby) {
      resultQuery = resultQuery.orderBy(sortBy || sortby, order || "asc");
    } else {
      resultQuery = resultQuery.orderBy("start");
    }

    if (today) {
      const time = moment(new Date());
      const start = time.startOf("day").toISOString();
      const end = time.endOf("day").toISOString();
      resultQuery = resultQuery
        .where("start", ">", start)
        .where("start", "<", end);
    }

    if (date) {
      const dateParts = date.split("-");
      const year = Number(dateParts[0]);
      const month = Number(dateParts[1]) - 1;
      const day = Number(dateParts[2]);
      const time = moment(new Date()).set({
        date: day,
        month,
        year
      });
      const start = time.startOf("day").toISOString();
      const end = time.endOf("day").toISOString();
      resultQuery = resultQuery
        .where("start", ">", start)
        .where("start", "<", end);
    }

    // Hent events
    let events: Partial<Event>[] = await resultQuery;
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(404).send(error);
  }
});

export default Router;
