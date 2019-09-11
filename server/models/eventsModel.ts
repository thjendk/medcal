import { Model } from "objection";

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
}

export default Event;
