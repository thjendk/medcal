import { Model } from "objection";

interface EventsTeachers {
  event_id: number;
  teacher_id: number;
}

class EventsTeachers extends Model {
  static tableName = "events_teachers";
  static idColumn = ["event_id", "teacher_id"];
}

export default EventsTeachers;
