import { CronJob } from "cron";
import ical from "ical";
import Event from "../models/eventsModel";
import _ from "lodash";
import TeamsEvents from "models/teamsEvents";
import Teacher from "models/teacherModel";
import EventsTeachers from "models/eventsTeachers";

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

const getLocationId = (event: Event) => {
  if (event.location.match(/aud a|auditorium a/i)) return "A";
  if (event.location.match(/aud b|auditorium b/i)) return "B";
  if (event.location.match(/aud c|auditorium c/i)) return "C";
  if (event.location.match(/aud j|auditorium j/i)) return "J";

  return null;
};

const getTypeFromEvent = (event: any) => {
  if (event.summary.match(/intro/i)) return "intro";
  if (event.description.match(/F\d+:/i)) return "lecture";
  return "unknown";
};

const appendZero = (string: string) => {
  return string.length === 1 ? `0${string}` : string;
};

const insertTeachers = async (
  event: Partial<Event>,
  teachers: Teacher[],
  result: Event
) => {
  // Find undervisere i eventet
  const eventTeachers: Teacher[] = [];
  for (let teacher of teachers) {
    if (
      event.description &&
      event.description.toLowerCase().includes(teacher.name.toLowerCase())
    ) {
      eventTeachers.push(teacher);
    }
  }

  // Hent de joins der allerede eksisterer for eventet
  const teacherJoins = await EventsTeachers.query().where({
    event_id: result.id
  });

  /* Tjek for om antallet af undervisere har ændret sig siden sidste opdatering.
  Hvis det har, så slet alle, og sæt dem ind igen. */
  if (
    eventTeachers.length > 0 &&
    teacherJoins.length !== eventTeachers.length
  ) {
    await EventsTeachers.query()
      .where({ event_id: result.id })
      .delete();

    for (let teacher of eventTeachers) {
      const exists = await EventsTeachers.query()
        .where({ event_id: result.id, teacher_id: teacher.id })
        .first();
      if (exists) continue;

      await EventsTeachers.query().insert({
        event_id: result.id,
        teacher_id: teacher.id
      });
    }
  }
};

const insertEventsAndTeachers = async (events: Partial<Event>[]) => {
  // Insert events into database
  let count = 1;
  for (let event of events) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Inserting event ${count} of ${events.length}`);
    }
    const { lecture_id, title, semester, year, season, team } = event;

    // Indsæt eventet i events, hvis det ikke allerede eksisterer
    let existsQuery = Event.query();
    // Sammenlign med forelæsningsID - hvis dette ikke eksiterer så sammenlign Titel, ellers så indsæt
    if (lecture_id) {
      existsQuery = existsQuery.where({ lecture_id });
    } else {
      existsQuery = existsQuery.where({ title });
    }

    const exists = await existsQuery.andWhere({ semester }).first();

    if (lecture_id) {
      await TeamsEvents.query().insert({
        lecture_id,
        team,
        season,
        year: year,
        semester
      });
    }

    // Team skal kun bruges til jointable'n teamEvents, men ikke til events.
    delete event.team;

    let result: Event;
    if (exists && !_.isEqual(event, exists)) {
      result = await Event.query().updateAndFetchById(exists.id, event);
    }
    if (!exists) {
      result = await Event.query().insert(event);
    } else {
      result = exists;
    }

    // Fjern alle undervisere, og sæt dem ind igen (i tilfælde af at flere undervisere er tilføjet til databasen, eller at nogen har ændret sig)
    const teachers = await Teacher.query();
    await insertTeachers(event, teachers, result);
    count++;
  }
  return "Done!";
};

const parseEvents = async (semester: number, team: number) => {
  console.log(`Parsing semester ${semester} and team ${team}`);
  const year = new Date()
    .getFullYear()
    .toString()
    .substr(2);
  const season = calculateSeason();
  const zeroTeam = appendZero(team.toString());
  const link = `http://skemahealthau.dk/skema/${season}${year}_0${semester -
    6}semHold${zeroTeam}.ics`;

  const getEventId = (event: any) => {
    if (event.description.match(/F\d+:/i)) {
      return (
        season +
        year +
        appendZero(semester.toString()) +
        appendZero(
          event.description
            .trim()
            .split(":")[0]
            .substr(1)
        )
      );
    } else {
      return null;
    }
  };

  // Creates the event object from ical
  let events: Partial<Event>[] = [];
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
                season: season,
                team: team,
                location_id: getLocationId(event)
              });
            }
          }
        }
        return resolve("Success");
      });
    });

  await getEventsFromIcal();

  return events;
};

export const populateEvents = async () => {
  let events: Partial<Event>[] = [];

  for (let key in semesters) {
    const teams = [...Array(semesters[key])];

    for (let [i, team] of teams.entries()) {
      const fetchedEvents: Partial<Event>[] = await parseEvents(
        Number(key),
        i + 1
      );
      events.push(...fetchedEvents);
    }
  }

  events = _.uniqBy(events, event => event.lecture_id || event.title);

  await insertEventsAndTeachers(events);

  console.log("Finished!");
};

const populateEventsCron = new CronJob("0 0 3 * * *", () => {
  console.log("Running cron job...");
  populateEvents();
});

export default populateEventsCron;
