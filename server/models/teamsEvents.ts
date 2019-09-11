import { Model } from "objection";

interface TeamsEvents {
  lecture_id: string | null;
  team: number;
  season: string;
  year: string;
  semester: number;
}

class TeamsEvents extends Model {
  static tableName = "teams_events";
}

export default TeamsEvents;
