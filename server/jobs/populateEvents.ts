import { CronJob } from "cron";
import ical from "ical";
import Event from "../models/events.model";
import _ from "lodash";
import TeamsEvents from "models/teamsEvents.model";
import Teacher from "models/teacher.model";
import EventsTeachers from "models/eventsTeachers.model";
import EventChanges from "models/eventChanges.model";
import moment from "moment-timezone";
type IcalEvent = Partial<Event> & { team: number };

/**
 * Key: semester, value: team
 */
const semesters = {
  7: 8,
  8: 16,
  9: 8,
  10: 16,
  11: 12,
  12: 12
};

/**
 * All locations are auditoriums on Skejby University Hospital
 */
const getLocationId = (event: Partial<Event>) => {
  if (event.location.match(/\w\d{3}\s*-\s*\d{3}/i)) {
    const locationId = event.location.split(/(\w\d{3}\s*-\s*\d{3})/i)[1];
    return locationId;
  }

  return null;
};

const getPlace = (event: Partial<Event>) => {
  if (event.location.match(/\d{4}\s*-\s*\d{3}/)) {
    return "AU";
  }

  if (event.location.match(/\D\d{3}\s*-\s*\d{3}/)) {
    return "AUH";
  }

  return null;
};

/**
 * Returns F for spring (forår) and E for autumn (efterår)
 */
const calculateSeason = () => {
  const now = new Date().getMonth();

  if (now < 6) {
    return "F";
  } else {
    return "E";
  }
};

/**
 * Returns the two last digits of the current year
 */
const calculateYear = () => {
  return Number(
    new Date()
      .getFullYear()
      .toString()
      .substr(2)
  );
};

const getEventId = (event: Partial<Event>, semester: number) => {
  if (event.title.match(/F\d+:/i)) {
    return (
      calculateSeason() +
      calculateYear() +
      appendZero(semester.toString()) +
      appendZero(event.title.split(/F(\d+):/)[1]) // Captures and selects the number after F
    );
  } else {
    return null;
  }
};

const getTypeFromEvent = (event: Partial<Event>) => {
  if (event.title.match(/intro/i)) return "intro";
  if (event.title.match(/F\d+:/i)) return "lecture";
  return "unknown";
};

const appendZero = (string: string) => {
  return string.length === 1 ? `0${string}` : string;
};

const handleEventChanges = async (
  newEvent: Partial<Event>,
  oldEvent: Event
) => {
  // Sammenligning
  const picks = ["title", "description", "location", "location_id", "start", "end"]; // Hvilke værdier der sammenlignes blandt
  const newEventComparison = _.pick(newEvent, picks);
  const oldEventComparison = _.pick(oldEvent, picks);

  // Hvis eventet eksisterer, og har ændret sig
  if (!_.isEqual(newEventComparison, oldEventComparison)) {
    return Event.query().updateAndFetchById(oldEvent.id, newEvent);
  }
};

/**
 * Fjerner alle undervisere, og sætter dem ind igen (i tilfælde af at flere undervisere er tilføjet til databasen, eller at nogen har ændret sig)
 * @param event
 */
const insertTeachers = async (event: Event) => {
  const teachers = await Teacher.query(); // Hent alle undervisere fra databasen

  try {
    // Find undervisere i eventet ved at loope over alle undervisere, og tjekke for dem i eventet
    const eventTeachers: Teacher[] = [];
    for (let teacher of teachers) {
      if (
        event.description &&
        event.description.toLowerCase().includes(teacher.name.toLowerCase())
      ) {
        eventTeachers.push(teacher);
      }
    }

    // Slet alle undervisere, og sæt dem ind igen (i tilfælde af ændringer)
    await EventsTeachers.query()
      .where({ eventId: event.id })
      .delete();
    for (let teacher of eventTeachers) {
      const exists = await EventsTeachers.query()
        .where({ eventId: event.id, teacherId: teacher.id })
        .first();
      if (exists) continue;

      await EventsTeachers.query().insert({
        eventId: event.id,
        teacherId: teacher.id
      });
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 * Fjerner alle hold fra eventet, og sætter dem ind igen
 * @param event
 * @param team
 */
const handleTeams = async (event: Event, team: number) => {
  const { lectureId, season, year, semester } = event;

  await TeamsEvents.query()
    .where({ lectureId, team })
    .delete();
  await TeamsEvents.query().insert({
    lectureId,
    team,
    season,
    year,
    semester
  });
};

const insertEventsAndTeachers = async (events: IcalEvent[]) => {
  try {
    let count = 1;
    for (let event of events) {
      let createdEvent = null as Event;

      const { lectureId } = event;
      const team = event.team; // Først kopieres team'et til dens egen variable.
      delete event.team; // Derefter fjernes team fra selve event objectet, da dette ikke skal indgå under events i databasen
      if (!lectureId) {
        // Hvis der ikke findes et ID på eventet trackes det ikke.
        if (process.env.NODE_ENV !== "production") {
          console.log(`Skipping event ${count} of ${events.length}`);
        }
        count++;
        continue;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`Parsing event ${count} of ${events.length}`);
      }
      // Check om eventet eksisterer
      const exists = await Event.query()
        .where({ lectureId })
        .first();

      if (exists) {
        // Eventet eksisterer, og skal logges
        await handleEventChanges(event, exists);
        createdEvent = exists;
      } else {
        // Eventet eksisterer ikke, og skal indsættes i databasen
        const result = await Event.query().insertAndFetch(event);
        if (event.lectureId) {
          await EventChanges.query().insert({
            param: "created",
            lectureId: result.lectureId,
            eventId: result.id,
            new: result.title
          });
        }
        createdEvent = result;
      }

      await handleTeams(createdEvent, team);
      await insertTeachers(createdEvent);
      count++;
    }
    return "Done!";
  } catch (error) {
    console.error(error);
  }
};

const parseEvents = async (semester: number, team: number) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`Parsing semester ${semester} and team ${team}`);
  }
  const year = calculateYear();
  const season = calculateSeason();
  const zeroTeam = appendZero(team.toString());
  const link = `http://skemahealthau.dk/skema/${season}${year}_0${semester -
    6}semHold${zeroTeam}.ics`;

  // Creates the event object from ical. We create a promise since ical is not promise based, but is still async.
  let events: IcalEvent[] = [];
  const getEventsFromIcal = async () =>
    new Promise((resolve, reject) => {
      ical.fromURL(link, {}, (err, data) => {
        for (let k in data) {
          if (data.hasOwnProperty(k)) {
            if (data[k].type == "VEVENT") {
              const event = data[k];
              event.title = event.summary;

              events.push({
                start: moment(event.start)
                  .tz("Europe/Copenhagen", true)
                  .toDate(),
                end: moment(event.end)
                  .tz("Europe/Copenhagen", true)
                  .toDate(),
                description: event.description,
                location: event.location,
                title: event.title,
                semester: semester,
                type: getTypeFromEvent(event),
                lectureId: getEventId(event, semester),
                year: year,
                season: season,
                team: team,
                place: getPlace(event),
                locationId: getLocationId(event)
              });
            }
          }
        }
        return resolve(0);
      });
    });

  await getEventsFromIcal();

  return events;
};

const deleteRemovedEvents = async (events: Partial<Event>[]) => {
  try {
    console.log("Removing leftover events...");
    const eventTitles = events.map(event => event.title || "");
    const eventDescriptions = events.map(event => event.description || "");

    const year = calculateYear();
    const season = calculateSeason();
    const deleted = await Event.query()
      .where({ season, year })
      .andWhere(function() {
        this.whereNotIn("title", eventTitles).orWhereNotIn(
          "description",
          eventDescriptions
        );
      });

    for (let deletion of deleted) {
      if (deletion.lectureId) {
        await EventChanges.query().insert({
          eventId: deletion.id,
          lectureId: deletion.lectureId,
          param: "deleted",
          old: deletion.title
        });
      }
    }

    await Event.query()
      .findByIds(deleted.map(deletion => deletion.id))
      .delete();
  } catch (error) {
    console.error(error);
  }
};

export const populateEvents = async () => {
  try {
    console.log("Running population...");
    let events: IcalEvent[] = [];

    for (let key in semesters) {
      for (let i = 0; i < semesters[key]; i++) {
        const fetchedEvents = await parseEvents(Number(key), i + 1);
        events.push(...fetchedEvents);
      }
    }

    if (events.length < 1000) {
      console.error(
        "Ikke nok events til at importere events (er serveren nede?). Prøver igen senere."
      );
      return setTimeout(() => {
        populateEvents();
      }, 1000 * 60 * 60);
    }

    await insertEventsAndTeachers(events);
    await deleteRemovedEvents(events);

    console.log("Finished!");
  } catch (error) {
    console.error(error);
  }
};

const populateEventsCron = new CronJob("0 0 6 * * *", () => {
  console.log("Running cron job...");
  populateEvents();
});

export default populateEventsCron;
