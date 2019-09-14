import express from "express";
import Event from "models/eventsModel";
import moment from "moment";
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
      id
    } = req.query;
    // Modify query params
    if (start) start = moment(start).format("YYYY-MM-DD HH:mm:ss");
    if (end) end = moment(end).format("YYYY-MM-DD HH:mm:ss");

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
        type: type,
        "teams.team": team
      })
      .skipUndefined();

    if (sortBy || sortby) {
      resultQuery = resultQuery.orderBy(sortBy || sortby, order || "asc");
    } else {
      resultQuery = resultQuery.orderBy("start");
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
