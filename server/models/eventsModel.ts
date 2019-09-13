import { Model } from "objection";
import TeamsEvents from "models/teamsEvents";
import Teacher from "models/teacherModel";
import OtherEventsTeams from "models/otherEventsTeams";

interface Event {
  id: number;
  lecture_id: string | null;
  title: string;
  type: string;
  description: string;
  location: string;
  location_id: string | null;
  start: string;
  end: string;
  teams: any[];
  semester: number;
  season: string;
  year: number;
  otherTeams: any[];
  updated_at: Date;
}

class Event extends Model {
  static tableName = "events";

  $beforeUpdate() {
    this.updated_at = new Date();
  }

  static relationMappings = {
    teams: {
      relation: Model.HasManyRelation,
      modelClass: TeamsEvents,
      join: {
        from: "events.lecture_id",
        to: "teams_events.lecture_id"
      }
    },
    otherTeams: {
      relation: Model.HasManyRelation,
      modelClass: OtherEventsTeams,
      join: {
        from: "events.id",
        to: "other_events_teams.event_id"
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
