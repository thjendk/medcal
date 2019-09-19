import { CronJob } from "cron";
import ical from "ical";
import Event from "../models/eventsModel";
import _ from "lodash";
import TeamsEvents from "models/teamsEvents";
import Teacher from "models/teacherModel";
import EventsTeachers from "models/eventsTeachers";
import OtherEventsTeams from "models/otherEventsTeams";
import EventChanges from "models/eventChangesModel";

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

const insertEventsAndTeachers = async (events: any[]) => {
  // Insert events into database
  let count = 1;
  for (let event of events) {
    const { lecture_id, title, semester, year, season } = event;
    const team = event.team;
    delete event.team; // Vi fjerner team fra selve event objectet, da dette ikke skal indgå under events i databasen

    // Indsæt eventet i events, hvis det ikke allerede eksisterer
    let existsQuery = Event.query();
    // Sammenlign med forelæsningsID - hvis dette ikke eksiterer så sammenlign Titel, ellers så indsæt
    if (lecture_id) {
      existsQuery = existsQuery.where({ lecture_id });
    } else {
      existsQuery = existsQuery.where({ title });
    }

    let exists = await existsQuery.andWhere({ semester }).first();

    let result: Event;
    if (
      exists &&
      !_.isEqualWith(
        event,
        exists,
        event =>
          !!{
            title: event.title,
            description: event.description,
            location: event.location
          }
      )
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`Updating event ${count} of ${events.length}`);
      }
      const picks = ["title", "description", "start", "end", "location"];
      const compareEvent = _.pick(event, picks);
      const compareExists = _.pick(exists, picks);
      const changedValues = _.omitBy(
        compareEvent,
        (event, index) => compareExists[index] === event
      );
      if (!_.isEmpty(changedValues)) {
        for (const change in changedValues) {
          await EventChanges.query().insert({
            param: change,
            lecture_id: exists.lecture_id,
            event_id: exists.id,
            old: exists[change],
            new: changedValues[change]
          });
        }
      }
      result = await Event.query().updateAndFetchById(exists.id, event);
    }
    if (!exists) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`Inserting event ${count} of ${events.length}`);
      }
      result = await Event.query().insertAndFetch(event);
      await EventChanges.query().insert({
        param: "created",
        lecture_id: result.lecture_id,
        event_id: result.id
      });
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `Ignoring event ${count} of ${events.length}. Already exists.`
        );
      }
      result = exists;
    }

    if (
      (lecture_id && !result.lecture_id) ||
      lecture_id !== result.lecture_id
    ) {
      await TeamsEvents.query()
        .where({ lecture_id: result.lecture_id })
        .delete();
      await TeamsEvents.query().insert({
        lecture_id,
        team,
        season,
        year: year,
        semester
      });
    } else {
      const joinExists = await OtherEventsTeams.query().findOne({
        event_id: result.id,
        team
      });
      if (!joinExists) {
        await OtherEventsTeams.query().insert({
          event_id: result.id,
          team
        });
      }
    }

    // Fjern alle undervisere, og sæt dem ind igen (i tilfælde af at flere undervisere er tilføjet til databasen, eller at nogen har ændret sig)
    const teachers = await Teacher.query();
    await insertTeachers(event, teachers, result);
    count++;
  }
  return "Done!";
};

const parseEvents = async (semester: number, team: number) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Parsing semester ${semester} and team ${team}`);
  }
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
  let events: any[] = [];
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

const deleteRemovedEvents = async (events: Partial<Event>[]) => {
  console.log("Removing leftover events...");
  const eventTitles = events.map(event => event.title || "");
  const eventDescriptions = events.map(event => event.description || "");

  const deleted = await Event.query()
    .whereNotIn("title", eventTitles)
    .orWhereNotIn("description", eventDescriptions);

  await EventChanges.query().insertGraph(
    deleted.map(deletion => ({
      event_id: deletion.id,
      lecture_id: deletion.lecture_id,
      param: "deleted",
      old: deletion.title
    }))
  );

  await Event.query()
    .findByIds(deleted.map(deletion => deletion.id))
    .delete();
};

export const populateEvents = async () => {
  console.log("Running population...");
  let events: Partial<Event>[] = [];

  for (let key in semesters) {
    const teams = [...Array(semesters[key])];

    for (let [i] of teams.entries()) {
      const fetchedEvents: Partial<Event>[] = await parseEvents(
        Number(key),
        i + 1
      );
      events.push(...fetchedEvents);
    }
  }

  await insertEventsAndTeachers(events);
  await deleteRemovedEvents(events);

  console.log("Finished!");
};

const populateEventsCron = new CronJob("0 0 3 * * *", () => {
  console.log("Running cron job...");
  populateEvents();
});

export default populateEventsCron;
