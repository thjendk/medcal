import { Model } from "objection";

interface OtherEventsTeams {
  event_id: number;
  team: number;
}

class OtherEventsTeams extends Model {
  static tableName = "other_events_teams";
  static idColumn = ["event_id", "team"];
}

export default OtherEventsTeams;
