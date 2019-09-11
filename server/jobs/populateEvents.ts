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
  // 6. semester er noget underligt, og kan vente?
  7: 8,
  8: 16,
  9: 8,
  10: 16,
  11: 12,
  12: 12
};

const parseEvents = async (semester: number, team: number) => {
  const getEventId = (event: any) => {
    if (event.description.match(/F\d+:/i)) {
      return (
        season +
        year +
        event.summary
          .trim()
          .split(":")[0]
          .substr(1)
      );
    } else {
      return null;
    }
  };

  const calculateSeason = () => {
    const now = new Date().getMonth();

    if (now < 6) {
      return "F";
    } else {
      return "E";
    }
  };

  const events: Partial<Event>[] = [];
  const year = new Date()
    .getFullYear()
    .toString()
    .substr(2);
  const season = calculateSeason();
  const zeroTeam = team.toString().length === 1 ? `0${team}` : team;
  let link = "";
  link = `http://skemahealthau.dk/skema/${season}${year}_0${semester -
    6}semHold${zeroTeam}.ics`;

  await ical.fromURL(link, {}, async (err, data) => {
    for (let k in data) {
      if (data.hasOwnProperty(k)) {
        if (data[k].type == "VEVENT") {
          const event = data[k];
          let type = "";

          // Checks which type of event it is
          if (event.summary.match(/intro/i)) {
            type = "intro";
          } else if (event.description.match(/F\d+:/i)) {
            type = "lecture";
          } else {
            type = "unknown";
          }

          // Creates the event object
          events.push({
            start: event.start,
            end: event.end,
            description: event.description,
            location: event.location,
            title: event.summary,
            semester: semester,
            type: type,
            lecture_id: getEventId(event),
            year: Number(year),
            season: season
          });
        }
      }
    }

    let count = 1;
    for (let event of events) {
      console.log(
        `Inserting event ${count} of ${events.length} (${(
          (count / events.length) *
          100
        ).toFixed(0)}%)`
      );
      const { lecture_id, title } = event;
      // Indsæt eventet i events, hvis det ikke allerede eksisterer (sammenlign med forelæsningsID - hvis dette ikke eksiterer så sammenlign Titel, ellers så indsæt)
      const exists = await Event.query()
        .where({ lecture_id, title })
        .first();
      if (exists) {
        await Event.query().updateAndFetchById(exists.id, event);
        continue;
      }

      await Event.query().insert(event);

      if (lecture_id) {
        await TeamsEvents.query().insert({ lecture_id, team, season, year });
      }
      count++;
    }
  });
  console.log("Finished!");
};

export const populateEvents = () => {
  for (let key in semesters) {
    const teams = [...Array(semesters[key])];

    teams.forEach(async (team, i) => await parseEvents(Number(key), i + 1));
  }
};

const populateEventsCron = new CronJob("0 0 2 * * *", () => {
  console.log("Running cron job...");
  populateEvents();
});

export default populateEventsCron;
