import { Model } from "objection";

interface TeamsEvents {
  lectureId: string | null;
  team: number;
  season: string;
  year: number;
  semester: number;
}

class TeamsEvents extends Model {
  static tableName = "teamsEvents";
}

export default TeamsEvents;
