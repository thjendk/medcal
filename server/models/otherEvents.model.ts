import { Model } from "objection";

interface OtherEventsTeams {
  eventId: number;
  team: number;
}

class OtherEventsTeams extends Model {
  static tableName = "otherEventsTeams";
  static idColumn = ["eventId", "team"];
}

export default OtherEventsTeams;
