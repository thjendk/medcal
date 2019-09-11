import { Model } from "objection";
import TeamsEvents from "models/teamsEvents";
import Teacher from "models/teacherModel";

interface Event {
  id: number;
  lecture_id: string | null;
  title: string;
  type: string;
  description: string;
  location: string;
  start: string;
  end: string;
  team: number;
  semester: number;
  season: string;
  year: number;
}

class Event extends Model {
  static tableName = "events";
  static relationMappings = {
    teams: {
      relation: Model.HasManyRelation,
      modelClass: TeamsEvents,
      join: {
        from: "events.lecture_id",
        to: "teams_events.lecture_id"
      }
    },
    teachers: {
      relation: Model.ManyToManyRelation,
      modelClass: Teacher,
      join: {
        from: "events.id",
        through: {
          from: "events_teachers.event_id",
          to: "events_teachers.teacher_id"
        },
        to: "teachers.id"
      }
    }
  };
}

export default Event;
