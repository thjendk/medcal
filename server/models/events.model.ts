import { Model } from "objection";
import TeamsEvents from "models/teamsEvents.model";
import Teacher from "models/teacher.model";
import OtherEventsTeams from "models/otherEvents.model";

interface Event {
  id: number;
  lectureId: string | null;
  title: string;
  type: string;
  description: string;
  location: string;
  locationId: string | null;
  start: Date;
  end: Date;
  teams: any[];
  semester: number;
  season: string;
  year: number;
  otherTeams: any[];
  updatedAt: Date;
}

class Event extends Model {
  static tableName = "events";

  $beforeUpdate() {
    this.updatedAt = new Date();
  }

  static defaultEager = "[teams, teachers, otherTeams]";

  static relationMappings = {
    teams: {
      relation: Model.HasManyRelation,
      modelClass: TeamsEvents,
      join: {
        from: "events.lectureId",
        to: "teamsEvents.lectureId"
      }
    },
    otherTeams: {
      relation: Model.HasManyRelation,
      modelClass: OtherEventsTeams,
      join: {
        from: "events.id",
        to: "otherEventsTeams.eventId"
      }
    },
    teachers: {
      relation: Model.ManyToManyRelation,
      modelClass: Teacher,
      join: {
        from: "events.id",
        through: {
          from: "eventsTeachers.eventId",
          to: "eventsTeachers.teacherId"
        },
        to: "teachers.id"
      }
    }
  };

  /**
   * Hvis der ikke er nogen teams i eventet, så replace med otherTeams (og derefter fjern otherTeams). Ellers fjernes bare otherTeams.
   */
  static reWriteTeams: any = (object: Event) => {
    if (!object.teams || object.teams.length < 1) {
      return {
        ...object,
        teams: object.otherTeams,
        otherTeams: undefined
      };
    } else {
      return { ...object, otherTeams: undefined };
    }
  };
}

export default Event;
