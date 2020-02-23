import { Model } from "objection";

interface EventChanges {
  lectureId: string | null;
  eventId: number | null;
  param: string;
  old: string;
  new: string;
  title: string;
}

class EventChanges extends Model {
  static tableName = "eventChanges";
}

export default EventChanges;
