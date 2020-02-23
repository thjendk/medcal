import Teacher from "models/teacher.model";
import axios from "axios";
import xlsx from "xlsx";
import _ from "lodash";

const semesters = [
  {
    url: "http://skemahealthau.dk/excel/E19_01semTilUdgivelse.xlsx",
    semester: 7,
    year: 2019,
    season: "E"
  },
  {
    url: "http://skemahealthau.dk/excel/E19_02semTilUdgivelse.xlsx",
    semester: 8,
    year: 2019,
    season: "E"
  },
  {
    url: "http://skemahealthau.dk/excel/E19_03semTilUdgivelse.xlsx",
    semester: 9,
    year: 2019,
    season: "E"
  },
  {
    url: "http://skemahealthau.dk/excel/E19_04semTilUdgivelse.xlsx",
    semester: 10,
    year: 2019,
    season: "E"
  },
  {
    url: "http://skemahealthau.dk/excel/E19_05semTilUdgivelse.xlsx",
    semester: 11,
    year: 2019,
    season: "E"
  },
  {
    url: "http://skemahealthau.dk/excel/E19_06semTilUdgivelse.xlsx",
    semester: 12,
    year: 2019,
    season: "E"
  }
];

export const populateTeachers = async () => {
  if (await Teacher.knex().schema.hasTable("teachers"))
    return "Teachers table already exists. Drop from database if creating anew";
  await Teacher.knex().schema.createTable("teachers", function(t) {
    t.increments("id").primary();
    t.string("name", 255);
    t.string("email", 255);
  });
  let insertTeachers: object[] = [];
  let currentCount = 1;
  for (let semester of semesters) {
    const { data: sheet } = await axios.get(semester.url, {
      responseType: "arraybuffer"
    });
    // Konverter excelarket til JSON, ved at bruge xlsx
    const parsed = xlsx.read(sheet, { cellDates: true });
    const jsonSheet = xlsx.utils.sheet_to_json(
      parsed.Sheets[parsed.SheetNames[0]]
    );
    // Filtrer events
    const filtered: any = jsonSheet.filter((event: any) => {
      if (!event.Fag || event.Fag === "OBLIGATORISK - Klinikophold") {
        return false;
      } else return true;
    });
    let teachers: any[] = [];
    for (let event of filtered) {
      // Insert teachers
      if (!event.Underviser) continue;
      teachers = teachers.concat(
        event.Underviser.trim().split(
          /, | og | & | eller |Ansvarlig: | \/ | + |\/ |\//
        )
      );
    }
    teachers = teachers.filter(t => {
      let returnBool = true;
      if (t.match(/@|\?/) || !t) returnBool = false;
      return returnBool;
    });
    for (let teacher of teachers) {
      console.log(
        `Working on teacher ${currentCount} / ${teachers.length} (${(
          (currentCount / teachers.length) *
          100
        ).toFixed(0)}%)`
      );
      currentCount++;
      // Check if the teacher is already in the database
      let exists = await Teacher.query()
        .where("name", "=", teacher)
        .first();
      if (exists) continue;
      insertTeachers.push({ name: teacher });
    }
  }
  insertTeachers = _.uniqBy(insertTeachers, "name");
  await Teacher.query().insertGraph(insertTeachers);
  console.log("Finished!");
  return "Success";
};
