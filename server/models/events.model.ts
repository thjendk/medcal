import { Model } from "objection";
import TeamsEvents from "models/teamsEvents.model";
import Teacher from "models/teacher.model";

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
}

export default Event;
