import { Model } from "objection";

interface EventChanges {
  lecture_id: string | null;
  event_id: number | null;
  param: string;
  old: string;
  new: string;
  title: string;
}

class EventChanges extends Model {
  static tableName = "event_changes";
}

export default EventChanges;
