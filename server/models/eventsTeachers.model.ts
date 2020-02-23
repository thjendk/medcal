import { Model } from "objection";

interface EventsTeachers {
  eventId: number;
  teacherId: number;
}

class EventsTeachers extends Model {
  static tableName = "eventsTeachers";
  static idColumn = ["eventId", "teacherId"];
}

export default EventsTeachers;
