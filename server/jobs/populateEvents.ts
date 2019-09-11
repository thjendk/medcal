import { CronJob } from "cron";
import ical from "ical";
import Event from "../models/eventsModel";
import _ from "lodash";
import TeamsEvents from "models/teamsEvents";

const semesters = {
  // 1: 9, // { Key: Semester, value: number of teams }
  // 2: 8,
  // 3: 6,
  // 4: 6,
  // 5: 8,
  // 6. semester er noget underligt noget
  7: 8,
  8: 16,
  9: 8,
  10: 16,
  11: 12,
  12: 12
};

const calculateSeason = () => {
  const now = new Date().getMonth();

  if (now < 6) {
    return "F";
  } else {
    return "E";
  }
};

const getTypeFromEvent = (event: any) => {
  if (event.summary.match(/intro/i)) return "intro";
  if (event.description.match(/F\d+:/i)) return "lecture";
  return "unknown";
};

const parseEvents = async (semester: number, team: number) => {
  console.log(`Inserting semester ${semester} and team ${team}`);
  let events: Partial<Event>[] = [];
  const year = new Date()
    .getFullYear()
    .toString()
    .substr(2);
  const season = calculateSeason();
  const zeroTeam = team.toString().length === 1 ? `0${team}` : team;
  let link = "";
  link = `http://skemahealthau.dk/skema/${season}${year}_0${semester -
    6}semHold${zeroTeam}.ics`;

  const getEventId = (event: any) => {
    if (event.description.match(/F\d+:/i)) {
      return (
        season +
        year +
        event.description
          .trim()
          .split(":")[0]
          .substr(1)
      );
    } else {
      return null;
    }
  };

  // Creates the event object from ical
  const getEventsFromIcal = async () =>
    new Promise((resolve, reject) => {
      ical.fromURL(link, {}, (err, data) => {
        for (let k in data) {
          if (data.hasOwnProperty(k)) {
            if (data[k].type == "VEVENT") {
              const event = data[k];

              events.push({
                start: event.start,
                end: event.end,
                description: event.description,
                location: event.location,
                title: event.summary,
                semester: semester,
                type: getTypeFromEvent(event),
                lecture_id: getEventId(event),
                year: Number(year),
                season: season
              });
            }
          }
        }
        return resolve("Success");
      });
    });

  await getEventsFromIcal();

  // Fjern duplicates inden de sammenlignes med databasen
  events = _.uniqBy(events, event => event.lecture_id || event.title);

  // Insert events into database
  for (let event of events) {
    const { lecture_id, title, semester } = event;

    // Indsæt eventet i events, hvis det ikke allerede eksisterer
    let existsQuery = Event.query();
    // Sammenlign med forelæsningsID - hvis dette ikke eksiterer så sammenlign Titel, ellers så indsæt
    if (lecture_id) {
      existsQuery = existsQuery.where({ lecture_id });
    } else {
      existsQuery = existsQuery.where({ title });
    }

    const exists = await existsQuery.andWhere({ semester }).first();

    if (exists) {
      await Event.query().updateAndFetchById(exists.id, event);
    } else {
      await Event.query().insert(event);
    }

    if (lecture_id) {
      await TeamsEvents.query().insert({
        lecture_id,
        team,
        season,
        year,
        semester
      });
    }
  }
};

export const populateEvents = async () => {
  for (let key in semesters) {
    const teams = [...Array(semesters[key])];

    for (let [i, team] of teams.entries()) {
      await parseEvents(Number(key), i + 1);
    }
  }

  console.log("Finished!");
};

const populateEventsCron = new CronJob("0 0 2 * * *", () => {
  console.log("Running cron job...");
  populateEvents();
});

export default populateEventsCron;
