import { Model } from "objection";

interface Teacher {
  id: number;
  name: string;
  email: string;
}

class Teacher extends Model {
  static tableName = "teachers";
}

export default Teacher;
