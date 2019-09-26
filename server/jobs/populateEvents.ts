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

export const compareEvents = async (
  event: any,
  exists?: any
): Promise<Event> => {
  // Sammenligning
  const picks = ["title", "description", "location", "start", "end"]; // Hvilke værdier der sammenlignes blandt
  const compareEvent = _.pick(event, picks);
  const compareExists = _.pick(exists, picks);

  // Hvis eventet eksisterer, men har ændret sig
  if (exists && !_.isEqual(compareEvent, compareExists)) {
    const changedValues: Partial<Event> = _.omitBy(
      compareEvent,
      (event, index) => _.isEqual(compareExists[index], event)
    );
    // Check om der var nogle værdier der havde ændret sig
    if (!_.isEmpty(changedValues) && event.lecture_id) {
      for (let change in changedValues) {
        await EventChanges.query().insert({
          param: change,
          lecture_id: exists.lecture_id,
          event_id: exists.id,
          old: exists[change],
          new: changedValues[change],
          title: exists.title
        });
      }
    }
    return Event.query().updateAndFetchById(exists.id, event);
  }

  // Hvis eventet ikke eksisterer
  if (!exists) {
    const result = await Event.query().insertAndFetch(event);
    if (event.lecture_id) {
      await EventChanges.query().insert({
        param: "created",
        lecture_id: result.lecture_id,
        event_id: result.id
      });
    }

    return result;
  }

  // Hvis eventet eksisterer, og ikke har ændret sig.
  return exists;
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
    console.log(`Parsing event ${count} of ${events.length}`);
    const { lecture_id, title, description, semester, year, season } = event;
    const team = event.team;
    delete event.team; // Vi fjerner team fra selve event objectet, da dette ikke skal indgå under events i databasen

    // Indsæt eventet i events, hvis det ikke allerede eksisterer
    let existsQuery = Event.query();
    // Sammenlign med forelæsningsID - hvis dette ikke eksiterer så sammenlign Titel, ellers så indsæt
    if (lecture_id) {
      existsQuery = existsQuery.where({ lecture_id });
    } else {
      existsQuery = existsQuery.where({ title, description });
    }

    const exists = await existsQuery.andWhere({ semester }).first();

    const result = await compareEvents(event, exists);

    if (lecture_id) {
      await TeamsEvents.query()
        .where({ lecture_id: result.lecture_id, team })
        .delete();
      await TeamsEvents.query().insert({
        lecture_id,
        team,
        season,
        year,
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

  for (let deletion of deleted) {
    if (deletion.lecture_id) {
      await EventChanges.query().insert({
        event_id: deletion.id,
        lecture_id: deletion.lecture_id,
        param: "deleted",
        old: deletion.title
      });
    }
  }

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

  if (events.length < 1000) {
    console.error('Ikke nok events til at fuldføre population');
    return setTimeout(() => {
      populateEvents();
    }, 1000 * 60 * 60)
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
